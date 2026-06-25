// js/modules/fahuo.js — 发货管理模块

/* ============================================================
 * <template>
 * ============================================================ */
const FahuoTemplate = `
  <div class="card">
    <div class="card-header">
      <span class="card-title">发货管理</span>
      <div class="toolbar">
        <button class="btn btn-primary" @click="openAdd">+ 新增发货</button>
      </div>
    </div>
    <div class="card-body">
      <data-table :rows="store.fahuo" :columns="columns" @edit="openEdit" @delete="remove" empty-text="暂无发货记录，点击"新增发货"开始" />
    </div>
    <modal :show="showForm" :title="isEdit ? '编辑发货记录' : '新增发货记录'" @close="showForm = false">
      <div class="form-grid">
        <div class="form-item full">
          <label>加工单号（关联）<span class="req">*</span></label>
          <search-select v-model="form.processId" :options="jgOptions" placeholder="— 选择加工单号 —" @change="onJgChange" />
          <span class="hint">可输入关键字搜索，选择后自动带出产品名称和客户</span>
        </div>
        <div class="form-item">
          <label>发货单号</label>
          <input v-model="form.id" readonly />
        </div>
        <div class="form-item">
          <label>发货日期</label>
          <input type="date" v-model="form.shipDate" />
        </div>
        <div class="form-item">
          <label>产品名称</label>
          <input v-model="form.productName" readonly />
        </div>
        <div class="form-item">
          <label>客户</label>
          <input v-model="form.customer" readonly />
        </div>
        <div class="form-item">
          <label>发货数量<span class="req">*</span></label>
          <input type="number" v-model="form.shipQty" placeholder="0" />
        </div>
        <div class="form-item">
          <label>物流单号</label>
          <input v-model="form.logisticsNo" placeholder="物流单号" />
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
const FahuoComponent = {
  name: 'FahuoComponent',
  setup() {
    const { ref, reactive, computed } = Vue;
    const store = window.store;
    const showForm = ref(false);
    const isEdit = ref(false);
    const form = reactive(Utils.emptyRow('fahuo'));

    const columns = [
      { key: 'id', label: '发货单号', sortable: true, align: 'center', width: '200px' },
      { key: 'processId', label: '加工单号', sortable: true, align: 'center', width: '200px' },
      { key: 'productName', label: '产品名称', sortable: true, align: 'center' },
      { key: 'customer', label: '客户名称', sortable: true, align: 'center', width: '300px' },
      { key: 'shipQty', label: '发货数量', sortable: true, align: 'center', type: 'number' },
      { key: 'logisticsNo', label: '物流单号', sortable: true, align: 'center' },
      { key: 'shipDate', label: '发货日期', sortable: true, align: 'center' }
    ];

    // 加工单号下拉选项
    const jgOptions = computed(() =>
      store.jiagong.map(j => ({ id: j.id, label: `${j.id} - ${j.productName} - ${j.customer}` }))
    );

    function openAdd() {
      Object.assign(form, Utils.emptyRow('fahuo'));
      form.id = Utils.genId(store.fahuo, 'id', 'FH');
      isEdit.value = false;
      showForm.value = true;
    }

    function openEdit(row) {
      Object.assign(form, row);
      isEdit.value = true;
      showForm.value = true;
    }

    // 选择加工单号后自动带出产品名称和客户
    function onJgChange() {
      const jg = store.jiagong.find(j => j.id === form.processId);
      if (jg) {
        form.productName = jg.productName;
        form.customer = jg.customer;
      }
    }

    function save() {
      if (!form.processId) { alert('请选择加工单号'); return; }
      if (!form.shipQty) { alert('请填写发货数量'); return; }
      if (isEdit.value) {
        const idx = store.fahuo.findIndex(r => r.id === form.id);
        if (idx > -1) store.fahuo[idx] = { ...form };
      } else {
        store.fahuo.push({ ...form });
      }
      Storage.save();
      store.showToast(isEdit.value ? '已保存修改' : '已新增发货记录');
      showForm.value = false;
    }

    function remove(row) {
      if (!confirm(`确认删除发货单 ${row.id}？\n删除后不可恢复。`)) return;
      const idx = store.fahuo.findIndex(r => r.id === row.id);
      if (idx > -1) store.fahuo.splice(idx, 1);
      Storage.save();
      store.showToast('已删除');
    }

    return { store, showForm, isEdit, form, columns, jgOptions, onJgChange, openAdd, openEdit, save, remove };
  },
  template: FahuoTemplate
};

/* ============================================================
 * <style scoped>
 * 本组件复用全局样式（card / form-grid / btn 等），无组件级样式
 * ============================================================ */

window.FahuoComponent = FahuoComponent;
