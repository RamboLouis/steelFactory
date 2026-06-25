// js/modules/data-manager.js — 数据管理模块（导入导出 + 绑定文件夹 + 清空）

/* ============================================================
 * <template>
 * ============================================================ */
const DataManagerTemplate = `
  <div>
    <input ref="fileInput" type="file" accept=".csv" style="display:none;" @change="onFileChange" />
    
    <div class="card dm-section">
      <div class="card-header"><span class="card-title">使用说明</span></div>
      <div style="padding:18px;font-size:13px;line-height:1.8;color:var(--text-sub);">
        <p><strong>首次使用：</strong>点击「加载示例数据」查看效果，或直接在「原料入库」开始录入。</p>
        <p><strong>业务流程：</strong>原料入库 → 新建加工单（关联入库单号）→ 新增发货（关联加工单号）→ 库存总览自动汇总。</p>
        <p><strong>数据安全：</strong>数据默认保存在浏览器中。推荐 Chrome/Edge 点击「绑定数据文件夹」，数据将自动存为 CSV 文件。</p>
        <p><strong>单号格式：</strong>RK-年月日-顺序号（如 RK-20250624-001），系统自动生成。</p>
        <p><strong>物料类别：</strong>钢板 / 无缝管 / 矩形管 / 圆钢 / 冷拉钢 / 槽钢 / 其他。</p>
      </div>
    </div>

    <div class="card dm-section">
      <div class="card-header"><span class="card-title">数据存储状态</span></div>
      <div style="padding:18px;">
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
          <span class="dm-stat">原料入库 <strong>{{ stats.ruku }}</strong> 条</span>
          <span class="dm-stat">加工进度 <strong>{{ stats.jiagong }}</strong> 条</span>
          <span class="dm-stat">发货管理 <strong>{{ stats.fahuo }}</strong> 条</span>
        </div>
        <p class="desc">
          当前存储模式：<strong>{{ store.storageMode === 'fsa' ? '文件夹模式（CSV自动读写）' : '浏览器存储（localStorage）' }}</strong>
          <span v-if="store.dirName"> ｜ 已绑定文件夹：{{ store.dirName }}</span>
        </p>
        <div class="dm-actions" v-if="fsaSupported">
          <button v-if="store.storageMode !== 'fsa'" class="btn btn-primary" @click="bindFolder">绑定数据文件夹</button>
          <button v-else class="btn btn-danger" @click="unbindFolder">解绑文件夹</button>
        </div>
        <p class="desc" v-else style="color:var(--warn-orange);">
          ⚠️ 当前浏览器不支持文件夹绑定（需 Chrome/Edge 86+）。建议使用"导出CSV"定期备份数据。
        </p>
      </div>
    </div>

    <div class="card dm-section">
      <div class="card-header"><span class="card-title">导出 CSV</span></div>
      <div style="padding:18px;">
        <p class="desc">导出 CSV 文件到本地。文件带 UTF-8 BOM，Excel 打开中文不乱码。</p>
        <div class="dm-actions">
          <button class="btn" @click="exportOne('ruku')">导出 原料入库</button>
          <button class="btn" @click="exportOne('jiagong')">导出 加工进度</button>
          <button class="btn" @click="exportOne('fahuo')">导出 发货管理</button>
          <button class="btn btn-primary" @click="exportAll">全部导出</button>
        </div>
      </div>
    </div>

    <div class="card dm-section">
      <div class="card-header"><span class="card-title">导入 CSV</span></div>
      <div style="padding:18px;">
        <p class="desc">从 CSV 文件导入数据，将覆盖对应表的现有数据。CSV 表头需与导出格式一致。</p>
        <div class="dm-actions">
          <button class="btn" @click="triggerImport('ruku')">导入 原料入库</button>
          <button class="btn" @click="triggerImport('jiagong')">导入 加工进度</button>
          <button class="btn" @click="triggerImport('fahuo')">导入 发货管理</button>
        </div>
      </div>
    </div>

    <div class="card dm-section">
      <div class="card-header"><span class="card-title">示例数据 与 清空</span></div>
      <div style="padding:18px;">
        <p class="desc">首次使用可加载示例数据体验。清空操作会删除所有数据，请先导出备份。</p>
        <div class="dm-actions">
          <button class="btn" @click="loadDemo">加载示例数据</button>
          <button class="btn btn-danger" @click="clearAll">清空所有数据</button>
        </div>
      </div>
    </div>
  </div>
`;

/* ============================================================
 * <script>
 * ============================================================ */
const DataManagerComponent = {
  name: 'DataManagerComponent',
  setup() {
    const { ref, computed } = Vue;
    const store = window.store;
    const fileInput = ref(null);
    const importTable = ref('ruku');

    const stats = computed(() => ({
      ruku: store.ruku.length,
      jiagong: store.jiagong.length,
      fahuo: store.fahuo.length
    }));

    const fsaSupported = computed(() => !!window.showDirectoryPicker);

    function exportAll() {
      Storage.exportAll();
      store.showToast('已导出3个CSV文件');
    }

    function exportOne(table) {
      const names = { ruku: '原料入库.csv', jiagong: '加工进度.csv', fahuo: '发货管理.csv' };
      Storage.exportCSV(table, names[table]);
      store.showToast('已导出 ' + names[table]);
    }

    function triggerImport(table) {
      importTable.value = table;
      fileInput.value.click();
    }

    function onFileChange(e) {
      const file = e.target.files[0];
      if (!file) return;
      if (!confirm(`导入将覆盖「${importTable.value === 'ruku' ? '原料入库' : importTable.value === 'jiagong' ? '加工进度' : '发货管理'}」表现有数据，是否继续？`)) {
        e.target.value = '';
        return;
      }
      Storage.importCSV(file, importTable.value).then(() => {
        store.showToast('导入成功');
        e.target.value = '';
      }).catch(err => {
        alert('导入失败：' + err.message);
        e.target.value = '';
      });
    }

    async function bindFolder() {
      await Storage.bindFolder();
    }

    async function unbindFolder() {
      if (!confirm('解绑文件夹后，数据将只保存在浏览器中。确认解绑？')) return;
      await Storage.unbindFolder();
    }

    function loadDemo() {
      if (!confirm('将加载示例数据，会覆盖现有数据。是否继续？')) return;
      Storage.loadDemoData();
      store.showToast('示例数据已加载');
    }

    function clearAll() {
      if (!confirm('⚠️ 此操作将清空所有业务数据（原料入库、加工进度、发货管理）！\n\n建议先导出CSV备份。确认清空？')) return;
      if (!confirm('再次确认：所有数据将被永久删除，确定吗？')) return;
      Storage.clearAll();
      store.showToast('所有数据已清空');
    }

    return { store, stats, fsaSupported, fileInput, exportAll, exportOne, triggerImport, onFileChange, bindFolder, unbindFolder, loadDemo, clearAll };
  },
  template: DataManagerTemplate
};

/* ============================================================
 * <style scoped>
 * 本组件复用全局样式（card / dm-stat / dm-actions / btn 等），无组件级样式
 * ============================================================ */

window.DataManagerComponent = DataManagerComponent;
