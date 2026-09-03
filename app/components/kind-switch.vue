<script setup lang="ts">
import type { Kind } from '#server/tmdb/types'
import { useI18n } from 'vue-i18n'

defineProps<{ modelValue: Kind, isHome?: boolean }>()
const emit = defineEmits<{ select: [value: Kind] }>()

const { t } = useI18n()

const options: { value: Kind, labelKey: 'browse.kindMovies' | 'browse.kindTvShows', dataKind: string }[] = [
  { value: 'MOVIE', labelKey: 'browse.kindMovies', dataKind: 'movie' },
  { value: 'TV_SHOW', labelKey: 'browse.kindTvShows', dataKind: 'tv' },
]

function isActive(optionValue: Kind, modelValue: Kind, isHome: boolean | undefined): boolean {
  return !!isHome && optionValue === modelValue
}
</script>

<template>
  <nav id="kindSwitch" :aria-label="t('browse.kindLabel')">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="kindSwitchBtn"
      :class="{ on: isActive(option.value, modelValue, isHome) }"
      :data-kind="option.dataKind"
      :aria-pressed="isActive(option.value, modelValue, isHome)"
      @click="emit('select', option.value)"
    >
      {{ t(option.labelKey) }}
    </button>
  </nav>
</template>

<style scoped>
#kindSwitch {
  display: flex;
  gap: 2px;
  align-items: center;
  margin-left: 4px;
}
.kindSwitchBtn {
  height: 32px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: var(--text-button-md);
  line-height: var(--leading-button-md);
  letter-spacing: var(--tracking-button-md);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.72);
  transition: background 0.16s, color 0.16s;
  background: transparent;
  border: none;
  cursor: pointer;
}
.kindSwitchBtn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}
.kindSwitchBtn.on {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
}
#siteHeader.scrolled .kindSwitchBtn.on {
  background: rgba(255, 255, 255, 0.14);
}
@media (max-width: 880px) {
  #kindSwitch {
    gap: 0;
  }
  .kindSwitchBtn {
    padding: 0 10px;
    font-size: var(--text-caption-md);
  }
}
</style>
