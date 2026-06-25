// js/utils.js — 工具函数
const Utils = {
  // 获取今日日期 YYYY-MM-DD
  today() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  // 获取今日日期 YYYYMMDD（用于单号）
  todayCompact() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  },

  // 格式化日期为 YYYY-MM-DD
  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  // 生成单号：前缀-YYYYMMDD-NNN
  // table: 数据数组, idField: 单号字段名, prefix: 前缀(RK/JG/FH)
  genId(table, idField, prefix) {
    const dateStr = this.todayCompact();
    const pattern = new RegExp(`^${prefix}-${dateStr}-(\\d+)$`);
    let maxNum = 0;
    table.forEach(row => {
      const val = row[idField] || '';
      const match = val.match(pattern);
      if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
    });
    const nextNum = String(maxNum + 1).padStart(3, '0');
    return `${prefix}-${dateStr}-${nextNum}`;
  },

  // 数值转数字（容错）
  toNum(v) {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  },

  // 金额格式化：保留2位小数，千分位
  formatMoney(v) {
    const n = this.toNum(v);
    return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  // 生成空行（各表默认值，英文键名）
  emptyRow(tableType) {
    const today = this.today();
    switch (tableType) {
      case 'ruku':
        return { id: '', materialName: '', category: '钢板', spec: '', quantity: '', unitPrice: '', totalPrice: 0, supplier: '', inboundDate: today };
      case 'jiagong':
        return { id: '', customer: '', productName: '', material: '', processQty: '', pickQty: '', status: '待加工', createDate: today, finishDate: '' };
      case 'fahuo':
        return { id: '', processId: '', productName: '', customer: '', shipQty: '', logisticsNo: '', shipDate: today };
      default:
        return {};
    }
  },

  // ===== 字段映射：英文键 ↔ 中文CSV表头 =====
  FIELD_MAP: {
    ruku: {
      id: '入库单号',
      materialName: '物料名称',
      category: '物料类别',
      spec: '规格',
      quantity: '数量',
      unitPrice: '单价',
      totalPrice: '总价',
      supplier: '供应商',
      inboundDate: '入库日期'
    },
    jiagong: {
      id: '加工单号',
      customer: '客户名称',
      productName: '产品名称',
      material: '使用原料',
      processQty: '加工数量',
      pickQty: '领料数量',
      status: '状态',
      createDate: '创建日期',
      finishDate: '完成日期'
    },
    fahuo: {
      id: '发货单号',
      processId: '加工单号',
      productName: '产品名称',
      customer: '客户',
      shipQty: '发货数量',
      logisticsNo: '物流单号',
      shipDate: '发货日期'
    }
  },

  // 英文键数据 → 中文键数据（用于CSV导出）
  toChineseRow(row, tableName) {
    const map = this.FIELD_MAP[tableName];
    const result = {};
    for (const enKey in map) {
      result[map[enKey]] = row[enKey];
    }
    return result;
  },

  // 中文键数据 → 英文键数据（用于CSV导入）
  toEnglishRow(row, tableName) {
    const map = this.FIELD_MAP[tableName];
    const reverseMap = {};
    for (const enKey in map) { reverseMap[map[enKey]] = enKey; }
    const result = {};
    for (const cnKey in row) {
      const enKey = reverseMap[cnKey];
      if (enKey) result[enKey] = row[cnKey];
    }
    return result;
  },

  // 数值字段列表
  NUM_FIELDS: {
    ruku: ['quantity', 'unitPrice', 'totalPrice'],
    jiagong: ['processQty', 'pickQty'],
    fahuo: ['shipQty']
  },

  // 单号字段名（英文）
  ID_FIELD: {
    ruku: 'id',
    jiagong: 'id',
    fahuo: 'id'
  }
};
window.Utils = Utils;
