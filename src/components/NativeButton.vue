<script>
import { h } from 'vue'

// Keep native keyboard and disabled semantics in H5: template <button>
// is otherwise compiled by uni-app into a non-focusable <uni-button>.
export default {
  name: 'NativeButton',
  inheritAttrs: false,
  render() {
    return h('button', { type: 'button', ...this.$attrs }, this.$slots.default?.())
  },
}
</script>
