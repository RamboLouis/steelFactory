// js/storage.js — 存储层（localStorage + CSV + FSA API + 服务端自动发现）
const Storage = {
  mode: 'localStorage',  // 'localStorage' | 'fsa' | 'server'
  dirHandle: null,        // FSA API 目录句柄
  dirName: '',            // 文件夹名称/路径描述

  // localStorage keys
  KEYS: {
    ruku: 'sf_ruku',
    jiagong: 'sf_jiagong',
    fahuo: 'sf_fahuo',
    warnLines: 'sf_warn_lines',
    dirHandle: 'sf_dir_handle'
  },

  // ===== 初始化 =====
  async init() {
    // 1) 尝试恢复 FSA 绑定（用户主动绑定的文件夹，双向读写）
    if (window.showDirectoryPicker) {
      try {
        const handle = await this._idbGet(this.KEYS.dirHandle);
        if (handle && await this._verifyPermission(handle)) {
          this.dirHandle = handle;
          this.mode = 'fsa';
          await this._loadFromCSV();
          // 解析完整路径（FS 句柄本身不暴露文件系统路径）
          this.dirName = await this._resolveDisplayPath(handle.name);
          store.storageMode = this.mode;
          store.dirName = this.dirName;
          return;
        }
      } catch (e) {
        // 恢复失败，继续降级
      }
    }

    // 2) 尝试从服务端自动发现 data/ 下 CSV（开发服务器模式，无需手动绑定）
    if (await this._detectAndLoadServerCSV()) {
      store.storageMode = this.mode;
      store.dirName = this.dirName;
      return;
    }

    // 3) 纯浏览器 localStorage 模式
    this._loadFromLocalStorage();
    store.storageMode = this.mode;
    store.dirName = this.dirName;
  },

  // ===== localStorage 存取 =====
  _loadFromLocalStorage() {
    store.ruku = this._parseLS(this.KEYS.ruku);
    store.jiagong = this._parseLS(this.KEYS.jiagong);
    store.fahuo = this._parseLS(this.KEYS.fahuo);
    store.warnLines = this._parseLS(this.KEYS.warnLines) || {};
  },

  _parseLS(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  _saveToLS() {
    localStorage.setItem(this.KEYS.ruku, JSON.stringify(store.ruku));
    localStorage.setItem(this.KEYS.jiagong, JSON.stringify(store.jiagong));
    localStorage.setItem(this.KEYS.fahuo, JSON.stringify(store.fahuo));
    localStorage.setItem(this.KEYS.warnLines, JSON.stringify(store.warnLines));
  },

  // ===== 服务端 CSV 自动发现（零配置，自动绑定项目根目录下的 data/ 文件夹）=====
  async _detectAndLoadServerCSV() {
    try {
      const resp = await fetch('data/ruku.csv');
      if (!resp.ok) return false;
    } catch {
      return false; // 非服务端环境，跳过
    }
    // 能请求到说明在开发服务器模式下运行，尝试加载全部 CSV
    const tables = ['ruku', 'jiagong', 'fahuo'];
    const missingTables = [];
    for (const tableName of tables) {
      try {
        const resp = await fetch(`data/${tableName}.csv`);
        if (!resp.ok) {
          missingTables.push(tableName);
          continue;
        }
        const text = await resp.text();
        if (!text.trim()) {
          missingTables.push(tableName);
          continue;
        }
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        const numFields = Utils.NUM_FIELDS[tableName] || [];
        store[tableName] = result.data.map(row => {
          const enRow = Utils.toEnglishRow(row, tableName);
          numFields.forEach(f => { enRow[f] = Utils.toNum(enRow[f]); });
          return enRow;
        });
      } catch (e) {
        missingTables.push(tableName);
      }
    }
    // 自动创建缺失的空白 CSV
    if (missingTables.length > 0) {
      await this._ensureServerCSVs(missingTables);
      // 创建完成后重新加载（新建的 CSV 只有表头 = 空数据）
      for (const tableName of missingTables) {
        try {
          const resp = await fetch(`data/${tableName}.csv`);
          if (resp.ok) {
            const text = await resp.text();
            const result = Papa.parse(text, { header: true, skipEmptyLines: true });
            const numFields = Utils.NUM_FIELDS[tableName] || [];
            store[tableName] = result.data.map(row => {
              const enRow = Utils.toEnglishRow(row, tableName);
              numFields.forEach(f => { enRow[f] = Utils.toNum(enRow[f]); });
              return enRow;
            });
          }
        } catch {}
      }
    }
    this.mode = 'server';
    this.dirName = await this._resolveDisplayPath('data');
    return true;
  },

  // 获取绑定文件夹的完整文件系统路径（用于状态栏显示）
  // 仅通过 /_server-info 自动检测，无需用户输入
  async _resolveDisplayPath(folderName) {
    try {
      const resp = await fetch('/_server-info');
      if (resp.ok) {
        const info = await resp.json();
        const cwd = info.cwd;
        const sep = cwd.includes('\\') ? '\\' : '/';
        return cwd + sep + folderName;
      }
    } catch {}
    return folderName;
  },

  // 自动创建缺失的空白 CSV 文件
  async _ensureServerCSVs(tables) {
    // 1) 优先通过已存储的 FSA 句柄静默写入（用户之前绑定过，文件直接到位）
    let wroteViaFSA = false;
    try {
      const handle = await this._idbGet(this.KEYS.dirHandle);
      if (handle && await this._verifyPermission(handle, true)) {
        const savedHandle = this.dirHandle;
        this.dirHandle = handle;
        for (const tableName of tables) {
          await this._writeCSV(`${tableName}.csv`, []);
        }
        this.dirHandle = savedHandle;
        // 验证写入是否生效（FSA 文件和服务器文件可能是不同路径）
        const verify = await fetch(`data/${tables[0]}.csv`);
        if (verify.ok) {
          wroteViaFSA = true;
        }
      }
    } catch {}
    // 2) FSA 不可用或写入后服务器读不到 → 下载回退
    if (!wroteViaFSA) {
      for (const tableName of tables) {
        this.exportCSV(tableName, `${tableName}.csv`);
      }
      store.showToast(`已生成空白 CSV 模板：${tables.join('、')}.csv，请保存到 data/ 文件夹`);
    }
  },

  // ===== 保存（双写）=====
  async save() {
    this._saveToLS();
    if (this.mode === 'fsa' && this.dirHandle) {
      try {
        await this._writeCSV('ruku.csv', store.ruku);
        await this._writeCSV('jiagong.csv', store.jiagong);
        await this._writeCSV('fahuo.csv', store.fahuo);
      } catch (e) {
        console.warn('CSV写入失败，已降级到localStorage', e);
      }
    }
  },

  // ===== CSV 导入导出（通用，所有浏览器）=====
  // 导出单个表为CSV文件（下载）。空表时只导出表头。CSV使用中文表头。
  exportCSV(tableName, filename) {
    const data = store[tableName];
    // 转为中文键用于CSV
    const cnData = (data && data.length > 0)
      ? data.map(r => Utils.toChineseRow(r, tableName))
      : [];
    let csv;
    if (cnData.length > 0) {
      csv = Papa.unparse(cnData);
    } else {
      csv = Papa.unparse({ fields: this._cnHeaders(tableName), data: [] });
    }
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${tableName}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // 导出全部三张表
  exportAll() {
    this.exportCSV('ruku', '原料入库.csv');
    setTimeout(() => this.exportCSV('jiagong', '加工进度.csv'), 200);
    setTimeout(() => this.exportCSV('fahuo', '发货管理.csv'), 400);
  },

  // 导入单个CSV文件（覆盖对应表）。CSV使用中文表头，导入后转为英文键。
  importCSV(file, tableName) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const numFields = Utils.NUM_FIELDS[tableName] || [];
          store[tableName] = results.data.map(row => {
            // 中文键 → 英文键
            const enRow = Utils.toEnglishRow(row, tableName);
            // 数值字段转数字
            numFields.forEach(f => { enRow[f] = Utils.toNum(enRow[f]); });
            return enRow;
          });
          this.save();
          resolve(results.data);
        },
        error: reject
      });
    });
  },

  // ===== File System Access API =====
  // 绑定本地数据文件夹
  async bindFolder() {
    if (!window.showDirectoryPicker) {
      alert('当前浏览器不支持文件夹绑定功能（需Chrome/Edge 86+）。\n您仍可使用"导出CSV"和"导入CSV"手动管理数据文件。');
      return false;
    }
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      await this._verifyPermission(handle, true);
      this.dirHandle = handle;
      this.dirName = handle.name;
      this.mode = 'fsa';
      await this._idbSet(this.KEYS.dirHandle, handle);
      // 把现有数据写入CSV
      await this.save();
      store.storageMode = this.mode;
      store.dirName = this.dirName;
      store.showToast('已绑定文件夹：' + handle.name);
      return true;
    } catch (e) {
      if (e.name !== 'AbortError') {
        alert('绑定文件夹失败：' + e.message);
      }
      return false;
    }
  },

  // 解绑文件夹
  async unbindFolder() {
    this.dirHandle = null;
    this.dirName = '';
    this.mode = 'localStorage';
    await this._idbDel(this.KEYS.dirHandle);
    store.storageMode = this.mode;
    store.dirName = '';
    store.showToast('已解绑文件夹，切换到浏览器存储');
  },

  // 验证/请求文件夹权限
  async _verifyPermission(handle, write = false) {
    const opts = { mode: write ? 'readwrite' : 'read' };
    if ((await handle.queryPermission(opts)) === 'granted') return true;
    if ((await handle.requestPermission(opts)) === 'granted') return true;
    return false;
  },

  // 从CSV文件加载到store（CSV中文键 → 英文键）
  async _loadFromCSV() {
    if (!this.dirHandle) return;
    const tables = ['ruku', 'jiagong', 'fahuo'];
    for (const tableName of tables) {
      try {
        const fileHandle = await this.dirHandle.getFileHandle(`${tableName}.csv`);
        const file = await fileHandle.getFile();
        const text = await file.text();
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        const numFields = Utils.NUM_FIELDS[tableName] || [];
        store[tableName] = result.data.map(row => {
          const enRow = Utils.toEnglishRow(row, tableName);
          numFields.forEach(f => { enRow[f] = Utils.toNum(enRow[f]); });
          return enRow;
        });
      } catch (e) {
        // 文件不存在，跳过（首次绑定时正常）
      }
    }
  },

  // 写入单个CSV文件到绑定文件夹（英文键 → 中文键CSV）
  async _writeCSV(filename, data) {
    if (!this.dirHandle) return;
    const fileHandle = await this.dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    const tableName = filename.replace('.csv', '');
    // 转为中文键
    const cnData = (data && data.length > 0)
      ? data.map(r => Utils.toChineseRow(r, tableName))
      : [];
    let csv;
    if (cnData.length > 0) {
      csv = Papa.unparse(cnData);
    } else {
      csv = Papa.unparse({ fields: this._cnHeaders(tableName), data: [] });
    }
    await writable.write('\uFEFF' + csv);
    await writable.close();
  },

  // 各表的中文表头列表（用于空表导出）
  _cnHeaders(tableName) {
    const map = Utils.FIELD_MAP[tableName] || {};
    return Object.values(map);
  },

  // ===== IndexedDB（存directory handle）=====
  _idbGet(key) {
    return new Promise((resolve) => {
      const req = indexedDB.open('sf_db', 1);
      req.onupgradeneeded = (e) => {
        e.target.result.createObjectStore('kv');
      };
      req.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('kv', 'readonly');
        const store = tx.objectStore('kv');
        const getReq = store.get(key);
        getReq.onsuccess = () => resolve(getReq.result);
        getReq.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    });
  },

  _idbSet(key, value) {
    return new Promise((resolve) => {
      const req = indexedDB.open('sf_db', 1);
      req.onupgradeneeded = (e) => {
        e.target.result.createObjectStore('kv');
      };
      req.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(value, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      };
    });
  },

  _idbDel(key) {
    return new Promise((resolve) => {
      const req = indexedDB.open('sf_db', 1);
      req.onupgradeneeded = (e) => {
        e.target.result.createObjectStore('kv');
      };
      req.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').delete(key);
        tx.oncomplete = () => resolve(true);
      };
    });
  },

  // ===== 清空数据 =====
  clearAll() {
    store.ruku = [];
    store.jiagong = [];
    store.fahuo = [];
    store.warnLines = {};
    this.save();
  },

  // ===== 填充示例数据 =====
  loadDemoData() {
    const today = Utils.today();
    const dateCompact = Utils.todayCompact();
    store.ruku = [
      { id: `RK-${dateCompact}-001`, materialName: 'Q235钢板', category: '钢板', spec: '10mm×1200×2400', quantity: 50, unitPrice: 4200, totalPrice: 210000, supplier: '上海宝钢', inboundDate: today },
      { id: `RK-${dateCompact}-002`, materialName: '45#圆钢', category: '圆钢', spec: 'Φ50', quantity: 30, unitPrice: 5100, totalPrice: 153000, supplier: '沙钢集团', inboundDate: today },
      { id: `RK-${dateCompact}-003`, materialName: '20#无缝管', category: '无缝管', spec: 'Φ89×6', quantity: 20, unitPrice: 6800, totalPrice: 136000, supplier: '天津钢管', inboundDate: today }
    ];
    store.jiagong = [
      { id: `JG-${dateCompact}-001`, customer: '张三机械厂', productName: '法兰盘', material: `RK-${dateCompact}-001`, processQty: 100, pickQty: 8, status: '已完成', createDate: today, finishDate: today },
      { id: `JG-${dateCompact}-002`, customer: '李四装备公司', productName: '传动轴', material: `RK-${dateCompact}-002`, processQty: 50, pickQty: 5, status: '加工中', createDate: today, finishDate: '' }
    ];
    store.fahuo = [
      { id: `FH-${dateCompact}-001`, processId: `JG-${dateCompact}-001`, productName: '法兰盘', customer: '张三机械厂', shipQty: 60, logisticsNo: 'SF20250624001', shipDate: today }
    ];
    this.save();
  }
};
window.Storage = Storage;
