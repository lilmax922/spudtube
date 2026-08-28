<script setup lang="ts">
import type { Component } from 'vue'
import type { RatingLabel } from '#server/db/schema/rating'
import { Star, ThumbsDown, ThumbsUp } from '@lucide/vue'
import { AnimatePresence, motion } from 'motion-v'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

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
  { label: 'SUCKS', icon: ThumbsDown },
  { label: 'GOOD', icon: ThumbsUp },
  { label: 'AWESOME', icon: Star },
]

const open = ref(false)
const hovered = ref(false)
const hoveredOption = ref<RatingLabel | null>(null)
const bouncing = ref<RatingLabel | null>(null)
let bounceTimer: ReturnType<typeof setTimeout> | null = null

const showFlyout = computed(() => open.value || hovered.value)
const selectedIcon = computed(() => RATING_OPTIONS.find(option => option.label === props.label)?.icon ?? ThumbsUp)
const selectedKey = computed(() => props.label ?? 'idle')
const optionLabel = (option: RatingLabel): string => t(`rating.${option.toLowerCase()}`)
const triggerLabel = computed(() => {
  if (!props.label)
    return t('rating.rate')
  return t('rating.rated', { label: optionLabel(props.label) })
})

watch(showFlyout, (visible) => {
  if (!visible)
    hoveredOption.value = null
})

onBeforeUnmount(() => {
  if (bounceTimer)
    clearTimeout(bounceTimer)
})

const BOUNCE_KEYFRAMES: Record<RatingLabel, { y: number[], scale: number[], rotate: number[] }> = {
  SUCKS: { y: [0, 10, -3, 0], scale: [1, 1.08, 1.02, 1], rotate: [0, 6, -3, 0] },
  GOOD: { y: [0, -10, 2, 0], scale: [1, 1.12, 1.04, 1], rotate: [0, -6, 3, 0] },
  AWESOME: { y: [0, -18, 5, 0], scale: [1, 1.18, 1.06, 1], rotate: [0, -10, 5, 0] },
}

const BOUNCE_TRANSITIONS: Record<RatingLabel, { duration: number, ease: string | number[], times: number[] }> = {
  SUCKS: { duration: 0.38, ease: 'easeOut', times: [0, 0.42, 0.78, 1] },
  GOOD: { duration: 0.42, ease: [0.34, 1.56, 0.64, 1], times: [0, 0.45, 0.8, 1] },
  AWESOME: { duration: 0.52, ease: [0.34, 1.56, 0.64, 1], times: [0, 0.35, 0.68, 1] },
}

function getBounceDuration(label: RatingLabel): number {
  return BOUNCE_TRANSITIONS[label].duration
}

function onTriggerClick(): void {
  if (!props.signedIn) {
    emit('signInRequested')
    return
  }
  open.value = !open.value
}

function onOptionClick(option: RatingLabel): void {
  if (!props.signedIn) {
    emit('signInRequested')
    open.value = false
    return
  }
  if (bouncing.value)
    return
  bouncing.value = option
  const durationMs = getBounceDuration(option) * 1000
  if (bounceTimer)
    clearTimeout(bounceTimer)
  bounceTimer = setTimeout(() => {
    bouncing.value = null
    bounceTimer = null
    if (props.label === option)
      emit('clear')
    else
      emit('select', option)
    open.value = false
  }, durationMs)
}
</script>

<template>
  <TooltipProvider :delay-duration="500">
    <div class="flex items-center gap-2">
      <span v-if="voteAverage != null" class="flex items-center gap-1.5 text-caption-md font-semibold text-foreground/85">
        <Star :size="14" :stroke-width="1.75" fill="currentColor" aria-hidden="true" />
        {{ voteAverage }}
        <span class="ml-1 font-medium text-muted-foreground">{{ t('rating.average') }}</span>
      </span>

      <div
        class="relative inline-flex"
        @mouseenter="hovered = true"
        @mouseleave="hovered = false"
      >
        <Tooltip>
          <TooltipTrigger as-child>
            <button
              type="button"
              class="flex size-[38px] items-center justify-center rounded-full border border-input bg-muted text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
              :aria-label="triggerLabel"
              :disabled="pending"
              @click="onTriggerClick"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  :key="selectedKey"
                  :initial="{ opacity: 0, scale: 0.8, y: 4 }"
                  :animate="{ opacity: 1, scale: 1, y: 0 }"
                  :exit="{ opacity: 0, scale: 0.8, y: -4 }"
                  :transition="{ duration: 0.16, ease: 'easeOut' }"
                  class="flex items-center justify-center"
                >
                  <component
                    :is="selectedIcon"
                    :size="18"
                    :stroke-width="1.75"
                    :fill="label || hovered ? 'currentColor' : 'none'"
                    aria-hidden="true"
                  />
                </motion.div>
              </AnimatePresence>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {{ triggerLabel }}
          </TooltipContent>
        </Tooltip>

        <AnimatePresence>
          <motion.div
            v-if="showFlyout"
            :initial="{ opacity: 0, scale: 0.85 }"
            :animate="{ opacity: 1, scale: 1 }"
            :exit="{ opacity: 0, scale: 0.85 }"
            :transition="{ type: 'spring', stiffness: 320, damping: 26, mass: 0.9 }"
            class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <div
              role="group"
              class="flex gap-1 rounded-full border border-border bg-popover p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-[12px]"
              :aria-label="t('rating.group')"
            >
              <Tooltip v-for="option in RATING_OPTIONS" :key="option.label">
                <TooltipTrigger as-child>
                  <button
                    type="button"
                    data-option
                    class="flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                    :aria-label="optionLabel(option.label)"
                    :aria-pressed="label === option.label"
                    :disabled="pending || bouncing !== null"
                    @click="onOptionClick(option.label)"
                    @mouseenter="hoveredOption = option.label"
                    @mouseleave="hoveredOption = null"
                  >
                    <motion.div
                      :animate="bouncing === option.label ? BOUNCE_KEYFRAMES[option.label] : { y: 0, scale: 1, rotate: 0 }"
                      :transition="bouncing === option.label ? BOUNCE_TRANSITIONS[option.label] : { duration: 0.15 }"
                      class="flex items-center justify-center"
                    >
                      <component
                        :is="option.icon"
                        :size="18"
                        :stroke-width="1.75"
                        :fill="label === option.label || hoveredOption === option.label ? 'currentColor' : 'none'"
                        aria-hidden="true"
                      />
                    </motion.div>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {{ optionLabel(option.label) }}
                </TooltipContent>
              </Tooltip>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  </TooltipProvider>
</template>
