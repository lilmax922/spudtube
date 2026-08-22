<script setup lang="ts">
import type { WatchStatus } from '#server/db/schema/title-status'
import { Bookmark, CircleCheck } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface Props {
  status: WatchStatus | null
  signedIn: boolean
  pending?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  pending: false,
})

const emit = defineEmits<{
  setStatus: [status: WatchStatus]
  clearStatus: []
  signInRequested: []
}>()

const { t } = useI18n()

const watchlisted = computed(() => props.status === 'WATCHLISTED')
const watched = computed(() => props.status === 'WATCHED')

function onWatchlistClick(): void {
  if (!props.signedIn) {
    emit('signInRequested')
    return
  }
  if (watchlisted.value)
    emit('clearStatus')
  else
    emit('setStatus', 'WATCHLISTED')
}

function onWatchedClick(): void {
  if (!props.signedIn) {
    emit('signInRequested')
    return
  }
  if (watched.value)
    emit('clearStatus')
  else
    emit('setStatus', 'WATCHED')
}
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      type="button"
      class="inline-flex h-[38px] items-center gap-1.5 rounded-[10px] border border-input bg-muted px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-2"
      :class="watchlisted && 'border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'"
      :aria-label="watchlisted ? t('watchStatus.watchlistRemove') : t('watchStatus.watchlistAdd')"
      :aria-pressed="watchlisted"
      :title="watchlisted ? t('watchStatus.watchlistRemove') : t('watchStatus.watchlistAdd')"
      :disabled="pending"
      @click="onWatchlistClick"
    >
      <Bookmark
        :size="16"
        :stroke-width="1.75"
        :fill="watchlisted ? 'currentColor' : 'none'"
        aria-hidden="true"
      />
      {{ t('watchStatus.watchlist') }}
    </button>

    <button
      type="button"
      class="inline-flex h-[38px] items-center gap-1.5 rounded-[10px] border border-input bg-muted px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-2"
      :class="watched && 'border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'"
      :aria-label="watched ? t('watchStatus.watchedClear') : t('watchStatus.watchedMark')"
      :aria-pressed="watched"
      :title="watched ? t('watchStatus.watchedClear') : t('watchStatus.watchedMark')"
      :disabled="pending"
      @click="onWatchedClick"
    >
      <CircleCheck
        :size="16"
        :stroke-width="1.75"
        :fill="watched ? 'currentColor' : 'none'"
        aria-hidden="true"
      />
      {{ t('watchStatus.watched') }}
    </button>
  </div>
</template>
