<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="site-footer" aria-label="Site footer">
    <div class="footer-shell">
      <div class="footer-grid">
        <div class="footer-brand">
          <p class="brand-name" aria-label="SpudTube">
            SpudTube
          </p>
          <p class="brand-desc">
            {{ t('footer.description') }}
          </p>
        </div>

        <nav class="footer-data" :aria-label="t('footer.attribution')">
          <a
            href="https://www.themoviedb.org"
            target="_blank"
            rel="noopener noreferrer"
            class="tmdb-logo-link"
            aria-label="The Movie Database"
          >
            <img
              src="/tmdb-logo.svg"
              alt="The Movie Database"
              width="110"
              height="14"
              loading="lazy"
              decoding="async"
            >
          </a>
          <p class="attr-text">
            <span>{{ t('footer.attribution') }}</span>
            <span class="attr-dot" aria-hidden="true"> · </span>
            <span>{{ t('footer.tmdbNotice') }}</span>
          </p>
        </nav>
      </div>

      <div class="footer-bottom">
        <p class="copyright">
          {{ t('footer.copyright', { year }) }}
        </p>
        <p class="crafted-by">
          Crafted by <a href="https://github.com/lilmax922" target="_blank" rel="noopener noreferrer">mxvvho</a>
        </p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  margin-top: 64px;
  border-top: 1px solid var(--border);
  background: var(--card);
}

.footer-shell {
  max-width: 960px;
  margin: 0 auto;
  padding: 48px var(--content-gutter) 32px;
}

.footer-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
}

.footer-brand {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 380px;
}

.brand-name {
  font-size: var(--text-heading-lg);
  line-height: var(--leading-heading-lg);
  letter-spacing: var(--tracking-heading-lg);
  font-weight: var(--weight-heading-lg);
  color: var(--foreground);
  margin: 0;
}

.brand-desc {
  font-size: var(--text-body-md);
  line-height: var(--leading-body-md);
  letter-spacing: var(--tracking-body-md);
  font-weight: var(--weight-body-md);
  color: var(--muted-foreground);
  margin: 0;
  text-wrap: pretty;
}

.footer-data {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
  max-width: 380px;
}

.tmdb-logo-link {
  display: inline-flex;
  align-items: center;
  border-radius: 6px;
  padding: 4px 6px;
  margin-left: -6px;
  width: fit-content;
  transition: background 0.15s, opacity 0.15s;
  text-decoration: none;
}
.tmdb-logo-link:hover {
  background: rgba(255, 255, 255, 0.06);
}
.tmdb-logo-link:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
.tmdb-logo-link img {
  display: block;
  height: 14px;
  width: auto;
  filter: brightness(1.06);
  opacity: 0.96;
}
.tmdb-logo-link:hover img {
  opacity: 1;
  filter: brightness(1.12);
}

.attr-text {
  font-size: var(--text-caption-sm);
  line-height: var(--leading-caption-sm);
  letter-spacing: var(--tracking-caption-sm);
  font-weight: var(--weight-caption-sm);
  color: var(--muted-foreground);
  margin: 0;
  text-wrap: pretty;
}
.attr-dot {
  color: var(--muted-foreground);
}

.footer-bottom {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.copyright {
  font-size: var(--text-caption-sm);
  line-height: var(--leading-caption-sm);
  letter-spacing: var(--tracking-caption-sm);
  font-weight: var(--weight-caption-sm);
  color: var(--muted-foreground);
  margin: 0;
  text-align: left;
  text-wrap: pretty;
}

.crafted-by {
  font-size: var(--text-caption-sm);
  line-height: var(--leading-caption-sm);
  letter-spacing: var(--tracking-caption-sm);
  font-weight: var(--weight-caption-sm);
  color: var(--muted-foreground);
  margin: 0;
  white-space: nowrap;
}
.crafted-by a {
  color: inherit;
  text-decoration: none;
  transition: color 0.15s;
}
.crafted-by a:hover {
  color: var(--foreground);
}
.crafted-by a:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
  border-radius: 4px;
}

@media (min-width: 880px) {
  .footer-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 32px;
  }

  .tmdb-logo-link img {
    height: 15px;
  }
}

@media (max-width: 559px) {
  .footer-shell {
    padding-top: 48px;
    padding-bottom: 32px;
  }
  .footer-grid {
    gap: 36px;
  }
  .tmdb-logo-link img {
    height: 13px;
  }
  .attr-dot {
    display: block;
    height: 0;
    overflow: hidden;
    visibility: hidden;
  }
  .attr-text span:last-child {
    display: block;
    margin-top: 4px;
  }
  .footer-bottom {
    margin-top: 40px;
    padding-top: 24px;
    flex-direction: column;
    align-items: flex-start;
  }
  .copyright {
    text-align: left;
  }
}
</style>
