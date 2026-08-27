<script setup lang="ts">
import type { CastMember } from '#server/tmdb/types'
import { User } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { tmdbImageUrl } from '../lib/images'

interface Props {
  cast: CastMember[]
}
const props = defineProps<Props>()

const { t } = useI18n()

const CAST_PROFILE_SIZE = 'w185'

const visibleCast = computed(() => props.cast.slice(0, 12))

function avatarUrl(path: string | null): string | null {
  return tmdbImageUrl(path, CAST_PROFILE_SIZE)
}
</script>

<template>
  <section
    v-if="visibleCast.length > 0"
    class="border-t border-border py-6"
    :aria-label="t('detail.cast.heading')"
  >
    <h2 class="mb-4 text-sm font-bold uppercase tracking-[0.06em] text-muted-foreground">
      {{ t('detail.cast.heading') }}
    </h2>
    <div class="flex gap-5 overflow-x-auto pb-1">
      <div
        v-for="member in visibleCast"
        :key="member.id"
        class="flex w-28 shrink-0 flex-col items-center gap-1.5 text-center"
      >
        <div class="flex size-28 items-center justify-center overflow-hidden rounded-full bg-muted">
          <img
            v-if="avatarUrl(member.profilePath)"
            :src="avatarUrl(member.profilePath) ?? undefined"
            :alt="member.name"
            class="h-full w-full object-cover"
            loading="lazy"
          >
          <User
            v-else
            :size="44"
            :stroke-width="1.6"
            aria-hidden="true"
          />
        </div>
        <span class="line-clamp-2 w-full text-xs leading-tight text-foreground">
          {{ member.name }}
        </span>
        <span
          v-if="member.character"
          class="line-clamp-1 w-full text-xs leading-tight text-muted-foreground"
        >
          {{ member.character }}
        </span>
      </div>
    </div>
  </section>
</template>
