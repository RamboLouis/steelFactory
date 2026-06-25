// js/app.js — 主应用
const app = Vue.createApp({
  setup() {
    const store = window.store;

    const modules = [
      { key: 'ruku', label: '原料入库', icon: '📦' },
      { key: 'jiagong', label: '加工进度', icon: '⚙️' },
      { key: 'fahuo', label: '发货管理', icon: '🚚' },
      { key: 'kucun', label: '库存总览', icon: '📊' },
      { key: 'data', label: '数据管理', icon: '🗂️' }
    ];

    const moduleLabels = {
      ruku: '原料入库',
      jiagong: '加工进度',
      fahuo: '发货管理',
      kucun: '库存总览',
      data: '数据管理'
    };

    const currentComponent = Vue.computed(() => {
      switch (store.activeModule) {
        case 'ruku': return 'RukuComponent';
        case 'jiagong': return 'JiagongComponent';
        case 'fahuo': return 'FahuoComponent';
        case 'kucun': return 'KucunComponent';
        case 'data': return 'DataManagerComponent';
        default: return 'RukuComponent';
      }
    });

    const currentTitle = Vue.computed(() => moduleLabels[store.activeModule] || '');

    function switchModule(key) {
      store.activeModule = key;
      localStorage.setItem('sf_active_module', key);
    }

    return { store, modules, currentComponent, currentTitle, switchModule };
  },
  template: `
    <div id="app">
      <aside class="sidebar">
        <div class="sidebar-logo">
          机械加工管理
          <div class="sub">业务管理系统 v1.0</div>
        </div>
        <nav class="sidebar-nav">
          <div v-for="m in modules" :key="m.key"
               class="nav-item" :class="{active: store.activeModule === m.key}"
               @click="switchModule(m.key)">
            <span class="icon">{{ m.icon }}</span>
            <span>{{ m.label }}</span>
          </div>
        </nav>
        <div class="sidebar-footer">
          双击 index.html 即可离线使用
        </div>
      </aside>
      <main class="main">
        <div class="topbar">
          <div class="topbar-left">{{ currentTitle }}</div>
          <div class="storage-badge" :class="{fsa: store.storageMode === 'fsa', server: store.storageMode === 'server'}">
            <span class="dot"></span>
            {{ store.storageMode === 'fsa' ? '文件夹模式 · ' + store.dirName :
               store.storageMode === 'server' ? '项目目录模式 · ' + store.dirName :
               '浏览器存储' }}
          </div>
        </div>
        <div class="content">
          <component :is="currentComponent"></component>
        </div>
      </main>
      <div class="toast" v-if="store.toast.show">{{ store.toast.text }}</div>
    </div>
  `
});

// 注册所有组件
app.component('DataTable', window.DataTable);
app.component('Modal', window.Modal);
app.component('SearchSelect', window.SearchSelect);
app.component('RukuComponent', window.RukuComponent);
app.component('JiagongComponent', window.JiagongComponent);
app.component('FahuoComponent', window.FahuoComponent);
app.component('KucunComponent', window.KucunComponent);
app.component('DataManagerComponent', window.DataManagerComponent);

// 初始化存储后挂载
Storage.init().then(() => {
  // 数据迁移：如果旧数据用的是中文键名，清除并重新加载示例数据
  const hasOldData = store.ruku.some(r => r.入库单号 !== undefined) ||
                      store.jiagong.some(r => r.加工单号 !== undefined) ||
                      store.fahuo.some(r => r.发货单号 !== undefined);
  if (hasOldData) {
    Storage.clearAll();
    localStorage.removeItem('sf_inited');
  }
  // 仅首次使用（从未加载过示例数据）时自动加载，清空后刷新不会重复加载
  if (!localStorage.getItem('sf_inited')) {
    Storage.loadDemoData();
    localStorage.setItem('sf_inited', '1');
  }
  // 恢复上次停留的模块
  const savedModule = localStorage.getItem('sf_active_module');
  if (savedModule) store.activeModule = savedModule;
  app.mount('#app');
});
