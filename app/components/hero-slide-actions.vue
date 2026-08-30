<script setup lang="ts">
import type { RatingLabel } from '#server/db/schema/rating'
import type { WatchStatus } from '#server/db/schema/title-status'
import type { Kind } from '#server/tmdb/types'
import { computed } from 'vue'
import { useTitleRating } from '../composables/use-title-rating'
import { useTitleStatus } from '../composables/use-title-status'
import { authClient, signIn } from '../lib/auth-client'
import RatingTrio from './rating-trio.vue'
import TitleStatusToggle from './title-status-toggle.vue'

const props = defineProps<{ kind: Kind, tmdbId: number }>()

const id = computed(() => String(props.tmdbId))
const session = authClient.useSession()
const signedIn = computed(() => session.value.data?.user != null)

const { label, pending: ratingPending, rate, clear } = useTitleRating(
  props.kind,
  id as unknown as import('vue').Ref<string | string[]>,
  signedIn,
)
const { status, pending: statusPending, set, clear: clearStatus } = useTitleStatus(
  props.kind,
  id as unknown as import('vue').Ref<string | string[]>,
  signedIn,
)

function onSelectRating(label: RatingLabel): void {
  void rate(label)
}
function onClearRating(): void {
  void clear()
}
function onSetStatus(next: WatchStatus): void {
  void set(next)
}
function onClearStatus(): void {
  void clearStatus()
}
function onSignInRequested(): void {
  void signIn.social({ provider: 'google' })
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <RatingTrio
      :label="label"
      :signed-in="signedIn"
      :pending="ratingPending"
      @select="onSelectRating"
      @clear="onClearRating"
      @sign-in-requested="onSignInRequested"
    />
    <TitleStatusToggle
      :status="status"
      :signed-in="signedIn"
      :pending="statusPending"
      @set-status="onSetStatus"
      @clear-status="onClearStatus"
      @sign-in-requested="onSignInRequested"
    />
  </div>
</template>
