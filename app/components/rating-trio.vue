<script setup lang="ts">
import type { Component } from 'vue'
import type { RatingLabel } from '#server/db/schema/rating'
import { Star, ThumbsDown, ThumbsUp } from '@lucide/vue'
import { computed, ref } from 'vue'
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
  { label: 'AWESOME', icon: Star },
  { label: 'GOOD', icon: ThumbsUp },
  { label: 'SUCKS', icon: ThumbsDown },
]

const open = ref(false)
const hovered = ref(false)

const showFlyout = computed(() => !props.pending && (open.value || hovered.value))
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
  if (!props.signedIn) {
    emit('signInRequested')
    open.value = false
    return
  }
  if (props.label === option)
    emit('clear')
  else
    emit('select', option)
  open.value = false
}
</script>

<template>
  <TooltipProvider :delay-duration="500">
    <div class="flex items-center gap-2">
      <span v-if="voteAverage != null" class="flex items-center gap-1.5 text-[13px] font-semibold text-foreground/85">
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
              class="flex size-10 items-center justify-center rounded-full border border-input bg-muted text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
              :class="label && 'border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'"
              :aria-label="triggerLabel"
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
          </TooltipTrigger>
          <TooltipContent>
            {{ triggerLabel }}
          </TooltipContent>
        </Tooltip>

        <Transition name="rate-fly">
          <div
            v-if="showFlyout"
            role="group"
            class="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-1 rounded-lg border border-border bg-popover p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-[12px]"
            :aria-label="t('rating.group')"
          >
            <Tooltip v-for="option in RATING_OPTIONS" :key="option.label">
              <TooltipTrigger as-child>
                <button
                  type="button"
                  data-option
                  class="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                  :class="label === option.label && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'"
                  :aria-label="optionLabel(option.label)"
                  :aria-pressed="label === option.label"
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
              </TooltipTrigger>
              <TooltipContent>
                {{ optionLabel(option.label) }}
              </TooltipContent>
            </Tooltip>
          </div>
        </Transition>
      </div>
    </div>
  </TooltipProvider>
</template>

<style scoped>
.rate-fly-enter-active,
.rate-fly-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.rate-fly-enter-from,
.rate-fly-leave-to {
  opacity: 0;
  transform: scale(0.85);
}
</style>
