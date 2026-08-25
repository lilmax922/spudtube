<script setup lang="ts">
import { Search, X } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

interface Props {
  query: string
  clearable?: boolean
}

withDefaults(defineProps<Props>(), {
  clearable: false,
})

const emit = defineEmits<{
  'update:query': [value: string]
  'search': []
  'clear': []
}>()

const { t } = useI18n()
</script>

<template>
  <form
    role="search"
    class="flex h-10 w-full max-w-sm items-center gap-2 rounded-md border border-input bg-card px-3 shadow-[0_4px_12px_rgba(0,0,0,0.25)] transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20"
    @submit.prevent="emit('search')"
  >
    <Search :size="16" :stroke-width="1.75" class="shrink-0 text-muted-foreground" aria-hidden="true" />
    <input
      :value="query"
      type="search"
      :aria-label="t('search.label')"
      :placeholder="t('search.placeholder')"
      class="h-full w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      @input="emit('update:query', ($event.target as HTMLInputElement).value)"
    >
    <button
      v-if="query !== '' || clearable"
      type="button"
      :aria-label="t('search.clear')"
      class="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
      @click="emit('clear')"
    >
      <X :size="16" :stroke-width="1.75" aria-hidden="true" />
    </button>
  </form>
</template>
