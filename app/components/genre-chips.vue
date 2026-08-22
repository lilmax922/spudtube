<script setup lang="ts">
import type { Genre } from '#server/tmdb/types'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  genres: Genre[]
  modelValue: number[]
}>()
const emit = defineEmits<{ toggle: [genreId: number] }>()

const { t } = useI18n()

function isSelected(genreId: number): boolean {
  return props.modelValue.includes(genreId)
}
</script>

<template>
  <div class="flex flex-wrap gap-2" role="group" :aria-label="t('browse.genresLabel')">
    <button
      v-for="genre in genres"
      :key="genre.id"
      type="button"
      class="h-[30px] rounded-lg border px-3 text-sm transition-colors"
      :class="isSelected(genre.id)
        ? 'border-transparent bg-primary text-primary-foreground'
        : 'border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'"
      :aria-pressed="isSelected(genre.id)"
      @click="emit('toggle', genre.id)"
    >
      {{ genre.name }}
    </button>
  </div>
</template>
