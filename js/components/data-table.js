// js/components/data-table.js — 通用表格组件（排序/筛选/分页）
const DataTable = {
  name: 'DataTable',
  props: {
    rows: { type: Array, default: () => [] },
    columns: { type: Array, default: () => [] }, // [{key, label, sortable, align, width, render}]
    pageSize: { type: Number, default: 20 },
    emptyText: { type: String, default: '暂无数据' }
  },
  emits: ['edit', 'delete'],
  setup(props, { emit }) {
    const { ref, computed, watch } = Vue;
    const sortKey = ref('');
    const sortOrder = ref('desc');
    const search = ref('');
    const currentPage = ref(1);
    const currentPageSize = ref(props.pageSize);

    const filteredRows = computed(() => {
      let data = props.rows;
      // 筛选
      if (search.value.trim()) {
        const kw = search.value.trim().toLowerCase();
        data = data.filter(row =>
          props.columns.some(col => {
            const val = row[col.key];
            return val != null && String(val).toLowerCase().includes(kw);
          })
        );
      }
      // 排序
      if (sortKey.value) {
        const col = props.columns.find(c => c.key === sortKey.value);
        const order = sortOrder.value === 'asc' ? 1 : -1;
        data = [...data].sort((a, b) => {
          let va = a[sortKey.value], vb = b[sortKey.value];
          if (col && col.type === 'number') { va = Number(va) || 0; vb = Number(vb) || 0; }
          else { va = String(va || ''); vb = String(vb || ''); }
          if (va < vb) return -1 * order;
          if (va > vb) return 1 * order;
          return 0;
        });
      }
      return data;
    });

    const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / currentPageSize.value)));
    const pagedRows = computed(() => {
      const start = (currentPage.value - 1) * currentPageSize.value;
      return filteredRows.value.slice(start, start + currentPageSize.value);
    });

    watch([search, sortKey, sortOrder], () => { currentPage.value = 1; });

    function toggleSort(col) {
      if (!col.sortable) return;
      if (sortKey.value === col.key) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
      } else {
        sortKey.value = col.key;
        sortOrder.value = 'desc';
      }
    }

    function cellValue(row, col) {
      if (col.render) return col.render(row);
      const val = row[col.key];
      if (col.type === 'money' && val != null && val !== '') return Utils.formatMoney(val);
      if (col.type === 'number' && val != null && val !== '') return Utils.toNum(val);
      return val;
    }

    return { sortKey, sortOrder, search, currentPage, currentPageSize, filteredRows, totalPages, pagedRows, toggleSort, cellValue, Utils };
  },
  template: `
    <div>
      <div class="toolbar" style="padding:12px 18px;border-bottom:1px solid var(--border);">
        <div class="search-box">
          <input v-model="search" placeholder="搜索关键字..." />
        </div>
        <div class="spacer"></div>
        <span style="font-size:12px;color:var(--text-sub);">共 {{ filteredRows.length }} 条</span>
      </div>
      <div class="data-content">
        <table class="data-table grid-table">
          <thead>
            <tr>
              <th style="width:50px;text-align:center;">序号</th>
              <th v-for="col in columns" :key="col.key"
                  :class="{ sortable: col.sortable, sorted: sortKey === col.key }"
                  :style="{ textAlign: col.align || 'left', width: col.width }"
                  @click="toggleSort(col)">
                {{ col.label }}
                <span v-if="col.sortable" class="sort-icon">
                  {{ sortKey === col.key ? (sortOrder === 'asc' ? '▲' : '▼') : '↕' }}
                </span>
              </th>
              <th style="width:110px;text-align:center;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="pagedRows.length === 0">
              <td :colspan="columns.length + 2" class="empty-row">{{ emptyText }}</td>
            </tr>
            <tr v-for="(row, i) in pagedRows" :key="i" :class="row._warn ? 'warn-row' : ''">
              <td style="text-align:center;color:var(--text-sub);">{{ (currentPage - 1) * currentPageSize + i + 1 }}</td>
              <td v-for="col in columns" :key="col.key"
                  :style="{ textAlign: col.align || 'center' }"
                  :class="{ num: col.align === 'right' }"
                  v-html="cellValue(row, col)"></td>
              <td class="actions" style="text-align:center;">
                <button class="btn-link" @click="$emit('edit', row)">编辑</button>
                <button class="btn-link" style="color:var(--warn-red);" @click="$emit('delete', row)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pagination" v-if="filteredRows.length > 0">
        <select v-model="currentPageSize">
          <option :value="20">20条/页</option>
          <option :value="50">50条/页</option>
          <option :value="100">100条/页</option>
        </select>
        <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 页</span>
        <button :disabled="currentPage === 1" @click="currentPage--">上一页</button>
        <template v-for="p in totalPages" :key="p">
          <button v-if="Math.abs(p - currentPage) < 3 || p === 1 || p === totalPages"
                  :class="{active: p === currentPage}" @click="currentPage = p">{{ p }}</button>
        </template>
        <button :disabled="currentPage === totalPages" @click="currentPage++">下一页</button>
      </div>
    </div>
  `
};
window.DataTable = DataTable;
