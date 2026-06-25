// js/components/search-select.js — 可搜索的下拉选择组件
const SearchSelect = {
  name: 'SearchSelect',
  props: {
    modelValue: { type: [String, Number], default: '' },
    options: { type: Array, default: () => [] },     // [{id, label}]
    placeholder: { type: String, default: '— 请选择 —' },
    disabled: { type: Boolean, default: false }
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    const { ref, computed, watch, onMounted, onUnmounted } = Vue;
    const open = ref(false);
    const keyword = ref('');
    const rootRef = ref(null);

    const selectedLabel = computed(() => {
      const opt = props.options.find(o => o.id === props.modelValue);
      return opt ? opt.label : '';
    });

    const filteredOptions = computed(() => {
      if (!keyword.value.trim()) return props.options;
      const kw = keyword.value.trim().toLowerCase();
      return props.options.filter(o => String(o.label).toLowerCase().includes(kw));
    });

    function toggleOpen() {
      if (props.disabled) return;
      open.value = !open.value;
      if (open.value) keyword.value = '';
    }

    function close() { open.value = false; }

    function select(opt) {
      emit('update:modelValue', opt.id);
      emit('change', opt.id);
      open.value = false;
      keyword.value = '';
    }

    function onDocClick(e) {
      if (rootRef.value && !rootRef.value.contains(e.target)) close();
    }

    onMounted(() => document.addEventListener('click', onDocClick));
    onUnmounted(() => document.removeEventListener('click', onDocClick));

    return { open, keyword, rootRef, selectedLabel, filteredOptions, toggleOpen, close, select };
  },
  template: `
    <div class="search-select" ref="rootRef">
      <div class="ss-display" :class="{disabled: disabled}" @click="toggleOpen">
        <span v-if="selectedLabel">{{ selectedLabel }}</span>
        <span v-else class="ss-placeholder">{{ placeholder }}</span>
        <span class="ss-arrow" :class="{up: open}">▾</span>
      </div>
      <div class="ss-dropdown" v-if="open">
        <div class="ss-search">
          <input v-model="keyword" placeholder="输入关键字搜索..." @click.stop />
        </div>
        <div class="ss-options">
          <div v-if="filteredOptions.length === 0" class="ss-empty">无匹配项</div>
          <div v-for="o in filteredOptions" :key="o.id"
               class="ss-option" :class="{active: o.id === modelValue}"
               @click="select(o)">
            {{ o.label }}
          </div>
        </div>
      </div>
    </div>
  `
};
window.SearchSelect = SearchSelect;
