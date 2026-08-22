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
    class="flex h-[38px] w-full max-w-sm items-center gap-2 rounded-lg border border-input bg-card px-3 transition-colors focus-within:border-ring"
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
      class="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
      @click="emit('clear')"
    >
      <X :size="16" :stroke-width="1.75" aria-hidden="true" />
    </button>
  </form>
</template>
