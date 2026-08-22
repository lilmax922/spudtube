<script setup lang="ts">
import type { Component } from 'vue'
import type { RatingLabel } from '#server/db/schema/rating'
import { Star, ThumbsDown, ThumbsUp } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

interface Props {
  label: RatingLabel | null
  signedIn: boolean
  pending?: boolean
  voteAverage?: number | null
}
const props = withDefaults(defineProps<Props>(), {
  pending: false,
  voteAverage: null,
})

const emit = defineEmits<{
  select: [label: RatingLabel]
  clear: []
  signInRequested: []
}>()

const { t } = useI18n()

interface RatingOption {
  label: RatingLabel
  icon: Component
}

const RATING_OPTIONS: RatingOption[] = [
  { label: 'AWESOME', icon: Star },
  { label: 'GOOD', icon: ThumbsUp },
  { label: 'SUCKS', icon: ThumbsDown },
]

const open = ref(false)
const hovered = ref(false)

const showFlyout = computed(() => props.signedIn && !props.pending && (open.value || hovered.value))
const selectedIcon = computed(() => RATING_OPTIONS.find(option => option.label === props.label)?.icon ?? ThumbsUp)
const optionLabel = (option: RatingLabel): string => t(`rating.${option.toLowerCase()}`)
const triggerLabel = computed(() => {
  if (!props.label)
    return t('rating.rate')
  return t('rating.rated', { label: optionLabel(props.label) })
})

function onTriggerClick(): void {
  if (!props.signedIn) {
    emit('signInRequested')
    return
  }
  open.value = !open.value
}

function onOptionClick(option: RatingLabel): void {
  if (props.label === option)
    emit('clear')
  else
    emit('select', option)
  open.value = false
}
</script>

<template>
  <div
    class="flex items-center gap-2"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <span v-if="voteAverage != null" class="flex items-center gap-1.5 text-[13px] font-semibold text-foreground/85">
      <Star :size="14" :stroke-width="1.75" fill="currentColor" aria-hidden="true" />
      {{ voteAverage }}
      <span class="ml-1 font-medium text-muted-foreground">{{ t('rating.average') }}</span>
    </span>

    <div class="relative inline-flex">
      <button
        type="button"
        class="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-input bg-muted text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
        :class="label && 'border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'"
        :aria-label="triggerLabel"
        :title="triggerLabel"
        :disabled="pending"
        @click="onTriggerClick"
      >
        <component
          :is="selectedIcon"
          :size="20"
          :stroke-width="1.75"
          :fill="label ? 'currentColor' : 'none'"
          aria-hidden="true"
        />
      </button>

      <Transition name="rating-fly">
        <div
          v-if="showFlyout"
          role="group"
          class="absolute bottom-full left-1/2 mb-2.5 flex -translate-x-1/2 gap-1 rounded-[10px] border border-border bg-popover p-1.5 shadow-lg"
          :aria-label="t('rating.group')"
        >
          <button
            v-for="option in RATING_OPTIONS"
            :key="option.label"
            type="button"
            data-option
            class="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
            :class="label === option.label && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'"
            :aria-label="optionLabel(option.label)"
            :aria-pressed="label === option.label"
            :title="optionLabel(option.label)"
            :disabled="pending"
            @click="onOptionClick(option.label)"
          >
            <component
              :is="option.icon"
              :size="18"
              :stroke-width="1.75"
              :fill="label === option.label ? 'currentColor' : 'none'"
              aria-hidden="true"
            />
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.rating-fly-enter-active,
.rating-fly-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.rating-fly-enter-from,
.rating-fly-leave-to {
  opacity: 0;
  transform: translate(-50%, 4px);
}
</style>
