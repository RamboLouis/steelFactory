// js/modules/ruku.js — 原料入库模块

/* ============================================================
 * <template>
 * ============================================================ */
const RukuTemplate = `
  <div class="card">
    <div class="card-header">
      <span class="card-title">原料入库</span>
      <div class="toolbar">
        <button class="btn btn-primary" @click="openAdd">+ 新增入库</button>
      </div>
    </div>
    <div class="card-body">
      <data-table :rows="store.ruku" :columns="columns" @edit="openEdit" @delete="remove" empty-text="暂无入库记录，点击"新增入库"开始" />
    </div>
    <modal :show="showForm" :title="isEdit ? '编辑入库记录' : '新增入库记录'" @close="showForm = false">
      <div class="form-grid">
        <div class="form-item">
          <label>入库单号</label>
          <input v-model="form.id" readonly />
        </div>
        <div class="form-item">
          <label>入库日期</label>
          <input type="date" v-model="form.inboundDate" />
        </div>
        <div class="form-item">
          <label>物料名称<span class="req">*</span></label>
          <input v-model="form.materialName" placeholder="如 Q235钢板" />
        </div>
        <div class="form-item">
          <label>物料类别</label>
          <select v-model="form.category">
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="form-item full">
          <label>规格</label>
          <input v-model="form.spec" placeholder="如 10mm×1200×2400" />
        </div>
        <div class="form-item">
          <label>数量<span class="req">*</span></label>
          <input type="number" v-model="form.quantity" @input="calcTotal" placeholder="0" />
        </div>
        <div class="form-item">
          <label>单价</label>
          <input type="number" v-model="form.unitPrice" @input="calcTotal" placeholder="0.00" />
        </div>
        <div class="form-item">
          <label>总价（自动）</label>
          <input :value="Utils.formatMoney(Utils.toNum(form.quantity) * Utils.toNum(form.unitPrice))" readonly />
        </div>
        <div class="form-item">
          <label>供应商</label>
          <input v-model="form.supplier" placeholder="供应商名称" />
        </div>
      </div>
      <template #footer>
        <button class="btn" @click="showForm = false">取消</button>
        <button class="btn btn-primary" @click="save">保存</button>
      </template>
    </modal>
  </div>
`;

/* ============================================================
 * <script>
 * ============================================================ */
const RukuComponent = {
  name: 'RukuComponent',
  setup() {
    const { ref, reactive } = Vue;
    const store = window.store;
    const showForm = ref(false);
    const isEdit = ref(false);
    const form = reactive(Utils.emptyRow('ruku'));

    const columns = [
      { key: 'id', label: '入库单号', sortable: true, align: 'center', width: '200px' },
      { key: 'materialName', label: '物料名称', sortable: true, align: 'center' },
      { key: 'category', label: '物料类别', sortable: true, align: 'center' },
      { key: 'spec', label: '规格', sortable: true, align: 'center' },
      { key: 'quantity', label: '数量', sortable: true, align: 'center', type: 'number' },
      { key: 'unitPrice', label: '单价', sortable: true, align: 'center', type: 'money' },
      { key: 'totalPrice', label: '总价', sortable: true, align: 'center', type: 'money', render: (r) => Utils.formatMoney(Utils.toNum(r.quantity) * Utils.toNum(r.unitPrice)) },
      { key: 'supplier', label: '供应商', sortable: true, align: 'center' },
      { key: 'inboundDate', label: '入库日期', sortable: true, align: 'center' }
    ];

    const categories = ['钢板', '无缝管', '矩形管', '圆钢', '冷拉钢', '槽钢', '其他'];

    // 总价实时计算
    function calcTotal() {
      form.totalPrice = Utils.toNum(form.quantity) * Utils.toNum(form.unitPrice);
    }

    function openAdd() {
      Object.assign(form, Utils.emptyRow('ruku'));
      form.id = Utils.genId(store.ruku, 'id', 'RK');
      isEdit.value = false;
      showForm.value = true;
    }

    function openEdit(row) {
      Object.assign(form, row);
      isEdit.value = true;
      showForm.value = true;
    }

    function save() {
      if (!form.materialName) { alert('请填写物料名称'); return; }
      if (!form.quantity) { alert('请填写数量'); return; }
      form.totalPrice = Utils.toNum(form.quantity) * Utils.toNum(form.unitPrice);
      if (isEdit.value) {
        const idx = store.ruku.findIndex(r => r.id === form.id);
        if (idx > -1) store.ruku[idx] = { ...form };
      } else {
        store.ruku.push({ ...form });
      }
      Storage.save();
      store.showToast(isEdit.value ? '已保存修改' : '已新增入库记录');
      showForm.value = false;
    }

    function remove(row) {
      if (!confirm(`确认删除入库单 ${row.id}（${row.materialName}）？\n删除后不可恢复。`)) return;
      const idx = store.ruku.findIndex(r => r.id === row.id);
      if (idx > -1) store.ruku.splice(idx, 1);
      Storage.save();
      store.showToast('已删除');
    }

    return { store, showForm, isEdit, form, columns, categories, calcTotal, openAdd, openEdit, save, remove, Utils };
  },
  template: RukuTemplate
};

/* ============================================================
 * <style scoped>
 * 本组件复用全局样式（card / form-grid / btn 等），无组件级样式
 * ============================================================ */

window.RukuComponent = RukuComponent;
