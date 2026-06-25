// js/store.js — 全局响应式状态
const store = Vue.reactive({
  // 三张业务表
  ruku: [],      // 原料入库
  jiagong: [],   // 加工进度
  fahuo: [],     // 发货管理

  // 库存预警线 { '物料名称|规格': 数量 }
  warnLines: {},

  // 存储模式：'localStorage' | 'fsa' | 'server'
  storageMode: 'localStorage',

  // 绑定的文件夹名称（FSA模式）
  dirName: '',

  // 当前活动模块
  activeModule: 'ruku',

  // 轻提示
  toast: { show: false, text: '', timer: null },

  // ===== 库存总览（自动计算）=====
  get kucun() {
    return this._computedKucun();
  },

  _computedKucun() {
    // 原料维度：按 物料名称+规格 聚合
    const materialMap = {};
    this.ruku.forEach(r => {
      const key = `${r.materialName}|${r.spec}`;
      if (!materialMap[key]) {
        materialMap[key] = {
          materialName: r.materialName,
          spec: r.spec,
          category: r.category,
          inboundQty: 0,
          pickQty: 0,
          remain: 0,
          warn: false
        };
      }
      materialMap[key].inboundQty += Utils.toNum(r.quantity);
    });
    // 加工领料：通过入库单号关联
    this.jiagong.forEach(j => {
      const ruku = this.ruku.find(r => r.id === j.material);
      if (ruku) {
        const key = `${ruku.materialName}|${ruku.spec}`;
        if (materialMap[key]) {
          materialMap[key].pickQty += Utils.toNum(j.pickQty);
        }
      }
    });
    Object.values(materialMap).forEach(m => {
      m.remain = m.inboundQty - m.pickQty;
      const warn = store.warnLines[`${m.materialName}|${m.spec}`];
      m.warn = m.remain < (warn !== undefined ? warn : 10);
    });

    // 成品维度：按 加工单号 聚合
    const productMap = {};
    this.jiagong.forEach(j => {
      const shipped = this.fahuo
        .filter(f => f.processId === j.id)
        .reduce((s, f) => s + Utils.toNum(f.shipQty), 0);
      productMap[j.id] = {
        processId: j.id,
        productName: j.productName,
        customer: j.customer,
        processQty: Utils.toNum(j.processQty),
        shipped: shipped,
        pending: Utils.toNum(j.processQty) - shipped,
        status: j.status
      };
    });

    return {
      materials: Object.values(materialMap),
      products: Object.values(productMap)
    };
  },

  // 显示轻提示
  showToast(text) {
    this.toast.text = text;
    this.toast.show = true;
    if (this.toast.timer) clearTimeout(this.toast.timer);
    this.toast.timer = setTimeout(() => { this.toast.show = false; }, 2000);
  }
});

window.store = store;
