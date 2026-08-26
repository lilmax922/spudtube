<script setup lang="ts">
import type { CastMember, CrewMember } from '#server/tmdb/types'
import { User } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { tmdbImageUrl } from '../lib/images'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'

interface Props {
  cast: CastMember[]
  crew?: CrewMember[]
}
const props = withDefaults(defineProps<Props>(), {
  crew: () => [],
})

const { t } = useI18n()

const CAST_PROFILE_SIZE = 'w185'

const visibleCast = computed(() => props.cast.slice(0, 12))

const fullCastOpen = ref(false)

interface CrewGroup {
  department: string
  members: CrewMember[]
}

const crewGroups = computed<CrewGroup[]>(() => {
  const groups: CrewGroup[] = []
  const byDepartment = new Map<string, CrewGroup>()
  for (const member of props.crew) {
    const department = member.department ?? t('detail.fullCast.other')
    let group = byDepartment.get(department)
    if (!group) {
      group = { department, members: [] }
      byDepartment.set(department, group)
      groups.push(group)
    }
    group.members.push(member)
  }
  return groups
})

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
    <h2 class="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.06em] text-muted-foreground">
      {{ t('detail.cast.heading') }}
      <span class="text-[11px] font-medium normal-case tracking-normal text-muted-foreground">
        {{ t('detail.cast.hint') }}
      </span>
    </h2>
    <div class="flex gap-3 overflow-x-auto pb-1">
      <div
        v-for="member in visibleCast"
        :key="member.id"
        class="flex w-24 shrink-0 flex-col items-center gap-1.5 text-center"
      >
        <div class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-muted text-2xl font-bold text-muted-foreground">
          <img
            v-if="avatarUrl(member.profilePath)"
            :src="avatarUrl(member.profilePath) ?? undefined"
            :alt="member.name"
            class="h-full w-full object-cover"
            loading="lazy"
          >
          <User
            v-else
            :size="28"
            :stroke-width="1.6"
            aria-hidden="true"
          />
        </div>
        <span class="line-clamp-2 w-full text-[12.5px] font-semibold leading-tight text-foreground">
          {{ member.name }}
        </span>
        <span
          v-if="member.character"
          class="line-clamp-1 w-full text-[11px] font-normal leading-tight text-muted-foreground"
        >
          {{ member.character }}
        </span>
        <span
          v-else
          class="text-[11px] font-normal text-muted-foreground"
          aria-hidden="true"
        >
          —
        </span>
      </div>
    </div>

    <Dialog v-model:open="fullCastOpen">
      <DialogTrigger as-child>
        <button
          type="button"
          class="-ml-3 mt-2 inline-flex min-h-10 items-center rounded-full px-3 text-[12.5px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
        >
          {{ t('detail.cast.fullCastLink') }} →
        </button>
      </DialogTrigger>
      <DialogContent
        class="gap-0 p-0 sm:max-w-[680px]"
        :close-label="t('detail.close')"
      >
        <DialogHeader class="border-b border-border px-5 py-4">
          <DialogTitle class="text-sm font-bold uppercase tracking-[0.06em]">
            {{ t('detail.fullCast.heading') }}
          </DialogTitle>
        </DialogHeader>
        <div class="max-h-[70vh] overflow-y-auto px-5 py-4">
          <section :aria-label="t('detail.fullCast.castSection')">
            <h3 class="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
              {{ t('detail.fullCast.castSection') }}
            </h3>
            <ul>
              <li
                v-for="member in cast"
                :key="member.id"
                class="flex items-center gap-3 border-b border-border/60 py-2 last:border-b-0"
              >
                <span class="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-bold text-muted-foreground">
                  <img
                    v-if="avatarUrl(member.profilePath)"
                    :src="avatarUrl(member.profilePath) ?? undefined"
                    :alt="member.name"
                    class="h-full w-full object-cover"
                    loading="lazy"
                  >
                  <User
                    v-else
                    :size="16"
                    :stroke-width="1.6"
                    aria-hidden="true"
                  />
                </span>
                <span class="min-w-0 text-sm font-medium text-foreground">{{ member.name }}</span>
                <span class="ml-auto shrink-0 text-right text-xs text-muted-foreground">
                  {{ member.character ?? '—' }}
                </span>
              </li>
            </ul>
          </section>

          <section
            v-if="crewGroups.length > 0"
            class="mt-6"
            :aria-label="t('detail.fullCast.crewSection')"
          >
            <h3 class="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-muted-foreground">
              {{ t('detail.fullCast.crewSection') }}
            </h3>
            <div
              v-for="group in crewGroups"
              :key="group.department"
              class="mt-4 first:mt-0"
            >
              <h4 class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-primary/90">
                {{ group.department }}
              </h4>
              <ul>
                <li
                  v-for="(member, index) in group.members"
                  :key="`${member.id}-${member.job}-${index}`"
                  class="flex items-center justify-between gap-3 py-1.5"
                >
                  <span class="min-w-0 truncate text-sm font-medium text-foreground">{{ member.name }}</span>
                  <span class="shrink-0 text-right text-xs text-muted-foreground">{{ member.job }}</span>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  </section>
</template>
