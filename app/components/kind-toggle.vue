<script setup lang="ts">
import type { Kind } from '#server/tmdb/types'
import { useI18n } from 'vue-i18n'

defineProps<{ modelValue: Kind }>()
const emit = defineEmits<{ 'update:modelValue': [value: Kind] }>()

const { t } = useI18n()

const options: { value: Kind, labelKey: 'browse.kindMovies' | 'browse.kindTvShows' }[] = [
  { value: 'MOVIE', labelKey: 'browse.kindMovies' },
  { value: 'TV_SHOW', labelKey: 'browse.kindTvShows' },
]
</script>

<template>
  <div class="inline-flex rounded-full bg-muted p-1" role="group" :aria-label="t('browse.kindLabel')">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="inline-flex h-[30px] min-h-10 items-center rounded-full px-4 text-button-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
      :class="option.value === modelValue
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:text-foreground'"
      :aria-pressed="option.value === modelValue"
      @click="emit('update:modelValue', option.value)"
    >
      {{ t(option.labelKey) }}
    </button>
  </div>
</template>
