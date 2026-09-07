<script setup lang="ts">
import type { Kind } from '#shared/kind/kind'
import type { RatingLabel, WatchStatus } from '#shared/personal-tracking/personal-tracking'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePersonalTracking } from '../composables/use-personal-tracking'
import { useToast } from '../composables/use-toast'
import { authClient } from '../lib/auth-client'
import AuthRequiredModal from './auth-required-modal.vue'
import RatingTrio from './rating-trio.vue'
import TitleStatusToggle from './title-status-toggle.vue'

const props = defineProps<{ kind: Kind, tmdbId: number }>()

const id = computed(() => String(props.tmdbId))
const session = authClient.useSession()
const signedIn = computed(() => session.value.data?.user != null)

const { t } = useI18n()
const { showToast } = useToast()
const { state: tracking, pending, rate, setStatus, clear } = usePersonalTracking(
  props.kind,
  id as unknown as import('vue').Ref<string | string[]>,
  signedIn,
)

function statusToastMessage(next: WatchStatus | null, target: WatchStatus): string {
  if (target === 'WATCHLISTED')
    return next ? t('watchStatus.toast.watchlistAdded') : t('watchStatus.toast.watchlistRemoved')
  return next ? t('watchStatus.toast.watchedAdded') : t('watchStatus.toast.watchedRemoved')
}

function showStatusToast(settled: WatchStatus | null, target: WatchStatus, previous: WatchStatus | null): void {
  showToast({
    message: statusToastMessage(settled, target),
    actionLabel: t('watchStatus.toast.undo'),
    onAction: () => {
      if (previous == null)
        void clear('status')
      else
        void setStatus(previous)
    },
  })
}

function onSelectRating(label: RatingLabel): void {
  void rate(label)
}
function onClearRating(): void {
  void clear('rating')
}
async function onSetStatus(next: WatchStatus): Promise<void> {
  const previous = tracking.value.status
  await setStatus(next)
  const settled = tracking.value.status
  if (settled === previous)
    return
  showStatusToast(settled, next, previous)
}
async function onClearStatus(): Promise<void> {
  const previous = tracking.value.status
  if (previous == null)
    return
  await clear('status')
  const settled = tracking.value.status
  if (settled === previous)
    return
  showStatusToast(settled, previous, previous)
}
const authModalOpen = shallowRef(false)

function onSignInRequested(): void {
  authModalOpen.value = true
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <RatingTrio
      :label="tracking.rating"
      :signed-in="signedIn"
      :pending="pending"
      @select="onSelectRating"
      @clear="onClearRating"
      @sign-in-requested="onSignInRequested"
    />
    <TitleStatusToggle
      :status="tracking.status"
      :signed-in="signedIn"
      :pending="pending"
      @set-status="onSetStatus"
      @clear-status="onClearStatus"
      @sign-in-requested="onSignInRequested"
    />
    <AuthRequiredModal v-model:open="authModalOpen" />
  </div>
</template>
