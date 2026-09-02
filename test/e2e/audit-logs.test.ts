import { createPage, type NuxtPage, setup } from '@nuxt/test-utils/e2e'
import {
  AUDIT_ACTION_TYPE,
  AUDIT_OUTCOME,
  AUDIT_TARGET_RESOURCE,
  type AuditLog,
} from '@server/models/audit-logs.schema'
import { JOB_TYPE } from '@server/models/jobs.schema'
import { describe, expect, it } from 'vitest'
import { createJobsResponse } from './fixtures'
import { getDebugConfig } from './helpers'

const ADMIN_USERNAME = process.env.NUXT_ADMIN_USERNAME ?? process.env.ADMIN_USERNAME ?? 'admin'
const ADMIN_PASSWORD =
  process.env.NUXT_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD ?? 'test-admin-password'
const DEBUG = process.env.E2E_TESTS_DEBUG === 'true'
const LOGIN_ENDPOINT = '/api/admin/auth/login'

const deletedJob = {
  job_id: 'queued-job-1111',
  job_type: JOB_TYPE.SCRAPE,
  game_id: 620,
  game_name: 'Portal 2',
}

const completedJob = {
  job_id: 'completed-job-3333',
  job_type: JOB_TYPE.SUMMARY,
  game_id: 1086940,
  game_name: "Baldur's Gate 3",
}

const auditEntries = [
  {
    audit_id: 'f833a84e-cf4e-4a43-92bc-9d3d5aa8aa10',
    created_at: new Date('2026-08-20T12:00:00.000Z'),
    user_identity: ADMIN_USERNAME,
    action_type: AUDIT_ACTION_TYPE.JOB_DELETE,
    outcome: AUDIT_OUTCOME.FAILURE,
    target_resource: AUDIT_TARGET_RESOURCE.JOB,
    target_id: deletedJob.job_id,
    context: {
      game_id: deletedJob.game_id,
      game_name: deletedJob.game_name,
      job_type: deletedJob.job_type,
      reason: 'conflict',
      status_code: 409,
    },
  },
  {
    audit_id: '66a4ef2e-4aa4-4c73-9d7b-a5aa3db5b458',
    created_at: new Date('2026-08-19T11:00:00.000Z'),
    user_identity: ADMIN_USERNAME,
    action_type: AUDIT_ACTION_TYPE.JOB_RUN,
    outcome: AUDIT_OUTCOME.SUCCESS,
    target_resource: AUDIT_TARGET_RESOURCE.JOB,
    target_id: completedJob.job_id,
    context: {
      game_id: completedJob.game_id,
      game_name: completedJob.game_name,
      job_type: completedJob.job_type,
    },
  },
] satisfies AuditLog[]

const isResponseFor = (responseUrl: string, pathname: string) =>
  new URL(responseUrl).pathname === pathname

async function login(page: NuxtPage) {
  await page.getByLabel('Username').fill(ADMIN_USERNAME)
  await page.getByLabel('Password').fill(ADMIN_PASSWORD)

  const loginResponsePromise = page.waitForResponse((response) =>
    isResponseFor(response.url(), LOGIN_ENDPOINT)
  )
  await page.getByRole('button', { name: 'Sign in' }).click()

  expect((await loginResponsePromise).status()).toBe(200)
  await page.waitForURL((url) => url.pathname === '/admin')
}

describe('audit logs page', async () => {
  await setup({
    ...(DEBUG ? getDebugConfig() : {}),
    env: {
      NUXT_ADMIN_USERNAME: ADMIN_USERNAME,
      NUXT_ADMIN_PASSWORD: ADMIN_PASSWORD,
    },
  })

  it('views audit entries and sends user, action, and date filters to the server', async () => {
    const page = await createPage('/admin')
    await page.route('**/api/jobs?*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createJobsResponse([])),
      })
    })
    await page.route('**/api/admin/audit-logs?*', (route) => {
      const url = new URL(route.request().url())
      const actionType = url.searchParams.get('action_type')
      const userIdentity = url.searchParams.get('user_identity')
      const items = auditEntries.filter(
        (entry) =>
          (!actionType || entry.action_type === actionType) &&
          (!userIdentity || entry.user_identity === userIdentity)
      )
      const requestedPage = Number(url.searchParams.get('page') ?? 1)
      const pageSize = Number(url.searchParams.get('page_size') ?? 25)
      const filtered = Boolean(actionType || userIdentity)

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items,
          total: filtered ? items.length : 30,
          page: requestedPage,
          page_size: pageSize,
          total_pages: filtered ? (items.length === 0 ? 0 : 1) : 2,
        }),
      })
    })

    await login(page)
    const initialAuditResponse = page.waitForResponse((response) =>
      isResponseFor(response.url(), '/api/admin/audit-logs')
    )
    await page.getByRole('link', { name: 'Audit logs' }).click()
    expect((await initialAuditResponse).status()).toBe(200)
    await page.getByRole('heading', { name: 'Audit logs' }).waitFor()

    expect(await page.locator('.audit-row').count()).toBe(2)
    expect(await page.getByText(deletedJob.job_id, { exact: true }).isVisible()).toBe(true)
    expect(await page.getByText(completedJob.job_id, { exact: true }).isVisible()).toBe(true)

    const nextPageButton = page.getByRole('button', { name: 'Next page' })
    const nextPageResponse = page.waitForResponse((response) => {
      const url = new URL(response.url())
      return url.pathname === '/api/admin/audit-logs' && url.searchParams.get('page') === '2'
    })
    await nextPageButton.click()
    expect((await nextPageResponse).status()).toBe(200)
    const pageInfo = page.getByText('Page 2 of 2')
    await pageInfo.waitFor()
    expect(await pageInfo.evaluate((element) => element === document.activeElement)).toBe(true)

    await page.getByLabel('User').fill(ADMIN_USERNAME)
    await page.getByLabel('Action').selectOption(AUDIT_ACTION_TYPE.JOB_DELETE)
    await page.getByLabel('From date').fill('2026-08-01')
    await page.getByLabel('To date').fill('2026-08-31')
    const filteredResponsePromise = page.waitForResponse((response) =>
      isResponseFor(response.url(), '/api/admin/audit-logs')
    )
    await page.getByRole('button', { name: 'Apply filters' }).click()
    const filteredResponse = await filteredResponsePromise
    const filteredUrl = new URL(filteredResponse.url())

    expect(filteredUrl.searchParams.get('user_identity')).toBe(ADMIN_USERNAME)
    expect(filteredUrl.searchParams.get('action_type')).toBe(AUDIT_ACTION_TYPE.JOB_DELETE)
    expect(filteredUrl.searchParams.get('date_from')).toBe('2026-08-01')
    expect(filteredUrl.searchParams.get('date_to')).toBe('2026-08-31')
    expect(await page.locator('.audit-row').count()).toBe(1)
    expect(await page.getByText(deletedJob.job_id, { exact: true }).isVisible()).toBe(true)
  })
})
