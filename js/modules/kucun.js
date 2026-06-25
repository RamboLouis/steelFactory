// js/modules/kucun.js — 库存总览模块（自动计算，只读）

/* ============================================================
 * <template>
 * ============================================================ */
const KucunTemplate = `
  <div>
    <div class="toolbar" style="margin-bottom:16px;gap:10px;">
      <span class="dm-stat">物料种类 <strong>{{ stats.matTotal }}</strong></span>
      <span class="dm-stat" style="color:var(--warn-red);">需补货 <strong>{{ stats.matWarn }}</strong></span>
      <span class="dm-stat" style="color:var(--warn-orange);">待发货加工单 <strong>{{ stats.prodPending }}</strong></span>
    </div>

    <div class="card kucun-section">
      <div class="card-header">
        <span class="card-title">原料库存（入库量 − 领料量 = 剩余）</span>
      </div>
      <div class="card-body">
        <div style="overflow-x:auto;">
          <table class="data-table grid-table">
            <thead>
              <tr>
                <th>物料名称</th>
                <th>规格</th>
                <th>类别</th>
                <th style="text-align:center;">入库量</th>
                <th style="text-align:center;">领料量</th>
                <th style="text-align:center;">剩余库存</th>
                <th style="text-align:center;">预警线</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="materials.length === 0">
                <td colspan="7" class="empty-row">暂无原料库存数据</td>
              </tr>
              <tr v-for="(m, i) in materials" :key="i" :class="m._warn ? 'warn-row' : ''">
                <td style="text-align:center;">{{ m.materialName }}</td>
                <td style="text-align:center;">{{ m.spec }}</td>
                <td style="text-align:center;">{{ m.category }}</td>
                <td class="num" style="text-align:center;">{{ m.inboundQty }}</td>
                <td class="num" style="text-align:center;">{{ m.pickQty }}</td>
                <td class="num" style="text-align:center;">
                  <span v-if="m._warn" style="color:var(--warn-red);font-weight:600;">{{ m.remain }}</span>
                  <span v-else>{{ m.remain }}</span>
                  <span v-if="m._warn" class="tag-warn" style="margin-left:6px;">需补货</span>
                </td>
                <td class="num" style="text-align:center;">
                  <input type="number" class="warn-input" :value="m.warnLine" @change="setWarn(m._key, $event.target.value)" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style="padding:10px 18px;font-size:12px;color:var(--text-sub);">
          预警线可直接在右侧输入框修改并保存。剩余库存低于预警线时显示红色"需补货"。
        </div>
      </div>
    </div>

    <div class="card kucun-section">
      <div class="card-header">
        <span class="card-title">成品待发（加工量 − 发货量 = 待发）</span>
      </div>
      <div class="card-body">
        <div style="overflow-x:auto;">
          <table class="data-table grid-table">
            <thead>
              <tr>
                <th style="width:200px;text-align:center;">加工单号</th>
                <th>产品名称</th>
                <th>客户</th>
                <th style="text-align:center;">加工量</th>
                <th style="text-align:center;">已发</th>
                <th style="text-align:center;">待发</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="products.length === 0">
                <td colspan="7" class="empty-row">暂无成品数据</td>
              </tr>
              <tr v-for="(p, i) in products" :key="i">
                <td style="text-align:center;">{{ p.processId }}</td>
                <td style="text-align:center;">{{ p.productName }}</td>
                <td style="text-align:center;">{{ p.customer }}</td>
                <td class="num" style="text-align:center;">{{ p.processQty }}</td>
                <td class="num" style="text-align:center;">{{ p.shipped }}</td>
                <td class="num" style="text-align:center;">
                  <span v-if="p.pending > 0" style="color:var(--warn-orange);font-weight:600;">{{ p.pending }}</span>
                  <span v-else class="muted">0</span>
                </td>
                <td style="text-align:center;"><span class="status-tag" :class="'status-' + p.status">{{ p.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
`;

/* ============================================================
 * <script>
 * ============================================================ */
const KucunComponent = {
  name: 'KucunComponent',
  setup() {
    const { computed } = Vue;
    const store = window.store;

    // 物料库存（带预警标记）
    const materials = computed(() => {
      return store.kucun.materials.map(m => {
        const key = `${m.materialName}|${m.spec}`;
        const warn = store.warnLines[key] !== undefined ? store.warnLines[key] : 10;
        return { ...m, _warn: m.remain < warn, warnLine: warn, _key: key };
      });
    });

    // 成品待发
    const products = computed(() => store.kucun.products);

    // 统计
    const stats = computed(() => ({
      matTotal: materials.value.length,
      matWarn: materials.value.filter(m => m._warn).length,
      prodPending: products.value.filter(p => p.pending > 0).length
    }));

    // 预警线编辑
    function setWarn(key, val) {
      store.warnLines[key] = Utils.toNum(val);
      Storage.save();
      store.showToast('预警线已更新');
    }

    return { store, materials, products, stats, setWarn, Utils };
  },
  template: KucunTemplate
};

/* ============================================================
 * <style scoped>
 * 本组件复用全局样式（card / data-table / status-tag / warn-row 等），无组件级样式
 * ============================================================ */

window.KucunComponent = KucunComponent;
