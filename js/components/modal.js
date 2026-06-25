// js/components/modal.js — 弹窗组件
const Modal = {
  name: 'Modal',
  props: {
    title: { type: String, default: '' },
    show: { type: Boolean, default: false }
  },
  emits: ['close'],
  setup(props, { emit }) {
    function close() { emit('close'); }
    return { close };
  },
  template: `
    <teleport to="body">
      <div v-if="show" class="modal-mask" @click.self="close">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">{{ title }}</span>
            <button class="modal-close" @click="close">×</button>
          </div>
          <div class="modal-body"><slot></slot></div>
          <div class="modal-footer"><slot name="footer"></slot></div>
        </div>
      </div>
    </teleport>
  `
};
window.Modal = Modal;
