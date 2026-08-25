<script setup lang="ts">
import { X } from '@lucide/vue'
import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SearchField from './search-field.vue'

interface Props {
  query: string
  open: boolean
  clearable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  clearable: false,
})

const emit = defineEmits<{
  'update:query': [value: string]
  'search': []
  'clear': []
  'close': []
}>()

const { t } = useI18n()
const panelRef = shallowRef<HTMLElement | null>(null)

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.open)
    emit('close')
}

function onBackdropClick(event: MouseEvent): void {
  if (event.target === event.currentTarget)
    emit('close')
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  }
  else {
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex flex-col items-center overflow-auto bg-background/72 p-4 pt-[72px] backdrop-blur-[12px]"
    role="presentation"
    @click="onBackdropClick"
  >
    <div
      ref="panelRef"
      role="dialog"
      aria-modal="true"
      :aria-label="t('search.label')"
      class="w-[min(720px,100%)] overflow-hidden rounded-xl border border-border bg-popover shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
      @click.stop
    >
      <div class="flex items-center gap-2 p-3">
        <div class="min-w-0 flex-1">
          <SearchField
            :query="query"
            :clearable="clearable"
            @update:query="emit('update:query', $event)"
            @search="emit('search')"
            @clear="emit('clear')"
          />
        </div>
        <button
          type="button"
          :aria-label="t('search.close')"
          class="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
          @click="emit('close')"
        >
          <X :size="16" :stroke-width="1.75" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>
