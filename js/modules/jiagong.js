// js/modules/jiagong.js — 加工进度模块

/* ============================================================
 * <template>
 * ============================================================ */
const JiagongTemplate = `
  <div class="card">
    <div class="card-header">
      <span class="card-title">加工进度</span>
      <div class="toolbar">
        <button class="btn btn-primary" @click="openAdd">+ 新建加工单</button>
      </div>
    </div>
    <div class="card-body">
      <data-table :rows="store.jiagong" :columns="columns" @edit="openEdit" @delete="remove" empty-text="暂无加工单，点击"新建加工单"开始" />
    </div>
    <modal :show="showForm" :title="isEdit ? '编辑加工单' : '新建加工单'" @close="showForm = false">
      <div class="form-grid">
        <div class="form-item full">
          <label>使用原料（关联入库单号）</label>
          <search-select v-model="form.material" :options="rukuOptions" placeholder="— 选择入库单号 —" />
          <span class="hint">可输入关键字搜索，关联后可追踪每批料用到哪个加工单</span>
        </div>
        <div class="form-item">
          <label>加工单号</label>
          <input v-model="form.id" readonly />
        </div>
        <div class="form-item">
          <label>创建日期</label>
          <input type="date" v-model="form.createDate" />
        </div>
        <div class="form-item">
          <label>客户名称<span class="req">*</span></label>
          <input v-model="form.customer" placeholder="如 张三机械厂" />
        </div>
        <div class="form-item">
          <label>产品名称<span class="req">*</span></label>
          <input v-model="form.productName" placeholder="如 法兰盘" />
        </div>
        <div class="form-item">
          <label>加工数量</label>
          <input type="number" v-model="form.processQty" placeholder="成品数量" />
        </div>
        <div class="form-item">
          <label>领料数量</label>
          <input type="number" v-model="form.pickQty" placeholder="消耗原料数量" />
        </div>
        <div class="form-item">
          <label>状态</label>
          <select v-model="form.status" @change="onStatusChange">
            <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div v-if="form.status === '已完成' || form.status === '已发货'" class="form-item">
          <label>完成日期</label>
          <input type="date" v-model="form.finishDate" />
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
const JiagongComponent = {
  name: 'JiagongComponent',
  setup() {
    const { ref, reactive } = Vue;
    const store = window.store;
    const showForm = ref(false);
    const isEdit = ref(false);
    const form = reactive(Utils.emptyRow('jiagong'));

    const statuses = ['待加工', '加工中', '检验中', '已完成', '已发货'];

    const columns = [
      { key: 'id', label: '加工单号', sortable: true, align: 'center', width: '200px' },
      { key: 'customer', label: '客户名称', sortable: true, align: 'center', width: '300px' },
      { key: 'productName', label: '产品名称', sortable: true, align: 'center' },
      { key: 'material', label: '使用原料', sortable: true, align: 'center',
        render: (r) => {
          const rk = store.ruku.find(x => x.id === r.material);
          return rk ? `<span>${rk.id}</span> <span class="muted">${rk.materialName}(${rk.spec})</span>` : (r.material || '<span class="muted">-</span>');
        }
      },
      { key: 'processQty', label: '加工量', sortable: true, align: 'center', type: 'number' },
      { key: 'pickQty', label: '领料量', sortable: true, align: 'center', type: 'number' },
      { key: 'status', label: '状态', sortable: true, align: 'center',
        render: (r) => `<span class="status-tag status-${r.status}">${r.status}</span>`
      },
      { key: 'createDate', label: '创建日期', sortable: true, align: 'center' },
      { key: 'finishDate', label: '完成日期', sortable: true, align: 'center' }
    ];

    // 入库单号下拉选项
    const rukuOptions = Vue.computed(() =>
      store.ruku.map(r => ({ id: r.id, label: `${r.id} - ${r.materialName}(${r.spec})` }))
    );

    function openAdd() {
      Object.assign(form, Utils.emptyRow('jiagong'));
      form.id = Utils.genId(store.jiagong, 'id', 'JG');
      isEdit.value = false;
      showForm.value = true;
    }

    function openEdit(row) {
      Object.assign(form, row);
      isEdit.value = true;
      showForm.value = true;
    }

    function onStatusChange() {
      // 状态变为已完成时自动填入完成日期
      if (form.status === '已完成' && !form.finishDate) {
        form.finishDate = Utils.today();
      }
      // 从已完成退回时清空完成日期
      if (form.status !== '已完成' && form.status !== '已发货') {
        form.finishDate = '';
      }
    }

    function save() {
      if (!form.customer) { alert('请填写客户名称'); return; }
      if (!form.productName) { alert('请填写产品名称'); return; }
      if (isEdit.value) {
        const idx = store.jiagong.findIndex(r => r.id === form.id);
        if (idx > -1) store.jiagong[idx] = { ...form };
      } else {
        store.jiagong.push({ ...form });
      }
      Storage.save();
      store.showToast(isEdit.value ? '已保存修改' : '已新增加工单');
      showForm.value = false;
    }

    function remove(row) {
      if (!confirm(`确认删除加工单 ${row.id}（${row.productName}-${row.customer}）？\n删除后不可恢复。`)) return;
      const idx = store.jiagong.findIndex(r => r.id === row.id);
      if (idx > -1) store.jiagong.splice(idx, 1);
      Storage.save();
      store.showToast('已删除');
    }

    return { store, showForm, isEdit, form, columns, statuses, rukuOptions, onStatusChange, openAdd, openEdit, save, remove };
  },
  template: JiagongTemplate
};

/* ============================================================
 * <style scoped>
 * 本组件复用全局样式（card / form-grid / status-tag 等），无组件级样式
 * ============================================================ */

window.JiagongComponent = JiagongComponent;
