import { createPage, type NuxtPage, setup, url as testUrl } from '@nuxt/test-utils/e2e'
import type { QueueJobRequest, QueueJobResponse } from '@server/api/jobs/queue.post'
import type { SteamGamesResponse } from '@server/api/steam/games/index.get'
import {
  AUDIT_ACTION_TYPE,
  AUDIT_OUTCOME,
  AUDIT_TARGET_RESOURCE,
  type AuditLog,
} from '@server/models/audit-logs.schema'
import { JOB_STATUS, JOB_TYPE, type Job } from '@server/models/jobs.schema'
import { describe, expect, it } from 'vitest'
import { createJobsResponse, portal2SearchItem, serviceUnavailableResponse } from './fixtures'
import { getDebugConfig } from './helpers'

const ADMIN_USERNAME = process.env.NUXT_ADMIN_USERNAME ?? process.env.ADMIN_USERNAME ?? 'admin'
const ADMIN_PASSWORD =
  process.env.NUXT_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD ?? 'test-admin-password'
const DEBUG = process.env.E2E_TESTS_DEBUG === 'true'
const LOGIN_ENDPOINT = '/api/admin/auth/login'

const queuedJob = {
  job_id: 'queued-job-1111',
  job_type: JOB_TYPE.SCRAPE,
  game_id: 620,
  game_name: 'Portal 2',
  status: JOB_STATUS.QUEUED,
  started_at: null,
  completed_at: null,
  created_at: new Date('2026-08-18T10:00:00.000Z'),
  updated_at: new Date('2026-08-18T10:00:00.000Z'),
} satisfies Job

const inProgressJob = {
  job_id: 'in-progress-job-2222',
  job_type: JOB_TYPE.FULL,
  game_id: 413150,
  game_name: 'Stardew Valley',
  status: JOB_STATUS.IN_PROGRESS,
  started_at: new Date('2026-08-18T11:00:00.000Z'),
  completed_at: null,
  created_at: new Date('2026-08-18T10:30:00.000Z'),
  updated_at: new Date('2026-08-18T11:00:00.000Z'),
} satisfies Job

const completedJob = {
  job_id: 'completed-job-3333',
  job_type: JOB_TYPE.SUMMARY,
  game_id: 1086940,
  game_name: "Baldur's Gate 3",
  status: JOB_STATUS.COMPLETED,
  started_at: new Date('2026-08-17T10:00:00.000Z'),
  completed_at: new Date('2026-08-17T10:01:00.000Z'),
  created_at: new Date('2026-08-17T09:59:00.000Z'),
  updated_at: new Date('2026-08-17T10:01:00.000Z'),
} satisfies Job

const failedJob = {
  job_id: 'failed-job-4444',
  job_type: JOB_TYPE.REPORTS,
  game_id: 1245620,
  game_name: 'ELDEN RING',
  status: JOB_STATUS.FAILED,
  status_message: 'The scrape failed after three attempts',
  started_at: new Date('2026-08-16T10:00:00.000Z'),
  completed_at: new Date('2026-08-16T10:01:00.000Z'),
  created_at: new Date('2026-08-16T09:59:00.000Z'),
  updated_at: new Date('2026-08-16T10:01:00.000Z'),
} satisfies Job

const jobs = [queuedJob, inProgressJob, completedJob, failedJob] satisfies Job[]

const auditEntries = [
  {
    audit_id: 'f833a84e-cf4e-4a43-92bc-9d3d5aa8aa10',
    created_at: new Date('2026-08-20T12:00:00.000Z'),
    user_identity: ADMIN_USERNAME,
    action_type: AUDIT_ACTION_TYPE.JOB_DELETE,
    outcome: AUDIT_OUTCOME.FAILURE,
    target_resource: AUDIT_TARGET_RESOURCE.JOB,
    target_id: queuedJob.job_id,
    context: {
      game_id: queuedJob.game_id,
      game_name: queuedJob.game_name,
      job_type: queuedJob.job_type,
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

const portal2SearchResponse = {
  items: [portal2SearchItem],
  total: 1,
} satisfies SteamGamesResponse

const queuedSummaryJobRequest = {
  game_id: portal2SearchItem.id,
  job_type: JOB_TYPE.SUMMARY,
} satisfies QueueJobRequest

const queuedSummaryJobResponse = {
  ...queuedJob,
  game_id: portal2SearchItem.id,
  game_name: portal2SearchItem.name,
  job_type: JOB_TYPE.SUMMARY,
} satisfies QueueJobResponse

const isResponseFor = (responseUrl: string, pathname: string) =>
  new URL(responseUrl).pathname === pathname

async function fillValidCredentials(page: NuxtPage) {
  await page.getByLabel('Username').fill(ADMIN_USERNAME)
  await page.getByLabel('Password').fill(ADMIN_PASSWORD)
}

async function submitValidLogin(page: NuxtPage, submit: () => Promise<void>) {
  const loginResponsePromise = page.waitForResponse((response) =>
    isResponseFor(response.url(), LOGIN_ENDPOINT)
  )

  await submit()
  const loginResponse = await loginResponsePromise

  expect(loginResponse.status()).toBe(200)
  await page.waitForURL((url) => url.pathname === '/admin')
}

async function login(page: NuxtPage) {
  await fillValidCredentials(page)
  await submitValidLogin(page, () => page.getByRole('button', { name: 'Sign in' }).click())
}

async function expectDashboard(page: NuxtPage) {
  const heading = page.getByRole('heading', { name: 'Job dashboard' })
  await heading.waitFor()

  expect(new URL(page.url()).pathname).toBe('/admin')
  expect(await heading.isVisible()).toBe(true)
}

async function mockJobs(page: NuxtPage, items: Parameters<typeof createJobsResponse>[0]) {
  await page.route('**/api/jobs?*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createJobsResponse(items)),
    })
  })
}

describe('admin page', async () => {
  await setup({
    ...(DEBUG ? getDebugConfig() : {}),
    env: {
      NUXT_ADMIN_USERNAME: ADMIN_USERNAME,
      NUXT_ADMIN_PASSWORD: ADMIN_PASSWORD,
    },
  })

  it('redirects unauthenticated visitors to the login page', async () => {
    const page = await createPage('/admin')
    const currentUrl = new URL(page.url())

    expect(currentUrl.pathname).toBe('/admin/login')
    expect(currentUrl.searchParams.get('redirect')).toBe('/admin')
    expect(await page.getByRole('heading', { name: 'Sign in' }).isVisible()).toBe(true)
  })

  it('logs in and redirects to the admin page', async () => {
    const page = await createPage('/admin')

    await login(page)
    await expectDashboard(page)
  })

  it('shows a generic error and clears the password after invalid credentials', async () => {
    const page = await createPage('/admin')
    const passwordInput = page.getByLabel('Password')

    await page.getByLabel('Username').fill(ADMIN_USERNAME)
    await passwordInput.fill('not-the-admin-password')
    const loginResponsePromise = page.waitForResponse((response) =>
      isResponseFor(response.url(), LOGIN_ENDPOINT)
    )
    await page.getByRole('button', { name: 'Sign in' }).click()
    const loginResponse = await loginResponsePromise
    const alert = page.getByRole('alert')
    await alert.waitFor()

    expect(loginResponse.status()).toBe(401)
    expect(new URL(page.url()).pathname).toBe('/admin/login')
    expect((await alert.textContent())?.trim()).toBe('Invalid username or password')
    expect(await passwordInput.inputValue()).toBe('')
  })

  it('keeps the authenticated session after reloading the admin page', async () => {
    const page = await createPage('/admin')

    await login(page)
    await page.reload()

    await expectDashboard(page)
  })

  it('logs out and prevents the old session from reopening the admin page', async () => {
    const page = await createPage('/admin')
    await login(page)
    const logoutResponsePromise = page.waitForResponse((response) =>
      isResponseFor(response.url(), '/api/admin/auth/logout')
    )

    await page.getByRole('button', { name: 'Log out' }).click()
    const logoutResponse = await logoutResponsePromise
    await page.waitForURL((url) => url.pathname === '/admin/login')

    expect(logoutResponse.status()).toBe(200)
    await page.goto(testUrl('/admin'))
    await page.waitForURL((url) => url.pathname === '/admin/login')
    expect(new URL(page.url()).searchParams.get('redirect')).toBe('/admin')
  })

  it('redirects authenticated visitors away from the login page', async () => {
    const page = await createPage('/admin')
    await login(page)

    await page.goto(testUrl('/admin/login'))
    await page.waitForURL((url) => url.pathname === '/admin')

    await expectDashboard(page)
  })

  it('returns to the original safe admin URL after login', async () => {
    const destination = '/admin?status=failed&sort=desc'
    const page = await createPage(destination)
    const loginUrl = new URL(page.url())

    expect(loginUrl.pathname).toBe('/admin/login')
    expect(loginUrl.searchParams.get('redirect')).toBe(destination)

    await login(page)
    const redirectedUrl = new URL(page.url())

    expect(redirectedUrl.pathname).toBe('/admin')
    expect(redirectedUrl.searchParams.get('status')).toBe('failed')
    expect(redirectedUrl.searchParams.get('sort')).toBe('desc')
  })

  it('disables the form and prevents duplicate submission while signing in', async () => {
    const page = await createPage('/admin')
    let markRequestStarted = () => {}
    let releaseRequest = () => {}
    const requestStarted = new Promise<void>((resolve) => {
      markRequestStarted = resolve
    })
    const requestGate = new Promise<void>((resolve) => {
      releaseRequest = resolve
    })

    await page.route(`**${LOGIN_ENDPOINT}`, async (route) => {
      markRequestStarted()
      await requestGate
      await route.continue()
    })
    await fillValidCredentials(page)

    const loginResponsePromise = page.waitForResponse((response) =>
      isResponseFor(response.url(), LOGIN_ENDPOINT)
    )
    const submitButton = page.getByRole('button', { name: 'Sign in' })
    const submitPromise = submitButton.click()
    await requestStarted

    try {
      expect(await page.getByRole('button', { name: 'Signing in…' }).isDisabled()).toBe(true)
      expect(await page.getByLabel('Username').isDisabled()).toBe(true)
      expect(await page.getByLabel('Password').isDisabled()).toBe(true)
    } finally {
      releaseRequest()
    }

    await submitPromise
    expect((await loginResponsePromise).status()).toBe(200)
    await page.waitForURL((url) => url.pathname === '/admin')
  })

  it('shows a server error and allows the user to retry login', async () => {
    const page = await createPage('/admin')
    let failNextLogin = true

    await page.route(`**${LOGIN_ENDPOINT}`, async (route) => {
      if (!failNextLogin) {
        await route.continue()
        return
      }

      failNextLogin = false
      await route.fulfill({
        status: serviceUnavailableResponse.statusCode,
        contentType: 'application/json',
        body: JSON.stringify(serviceUnavailableResponse),
      })
    })
    await fillValidCredentials(page)
    const failedResponsePromise = page.waitForResponse((response) =>
      isResponseFor(response.url(), LOGIN_ENDPOINT)
    )
    await page.getByRole('button', { name: 'Sign in' }).click()
    const failedResponse = await failedResponsePromise
    const alert = page.getByRole('alert')
    await alert.waitFor()

    expect(failedResponse.status()).toBe(serviceUnavailableResponse.statusCode)
    expect((await alert.textContent())?.trim()).toBe(serviceUnavailableResponse.statusMessage)
    expect(new URL(page.url()).pathname).toBe('/admin/login')

    await login(page)
    await expectDashboard(page)
  })

  it('submits the login form with the Enter key', async () => {
    const page = await createPage('/admin')
    await fillValidCredentials(page)

    await submitValidLogin(page, () => page.getByLabel('Password').press('Enter'))

    await expectDashboard(page)
  })

  it('shows job totals and filters the dashboard table', async () => {
    const page = await createPage('/admin')
    await mockJobs(page, jobs)
    await login(page)
    await page.getByText('Showing 1–4 of 4 jobs').waitFor()

    expect(await page.locator('.stat-card.queued .stat-value').textContent()).toBe('1')
    expect(await page.locator('.stat-card.in-progress .stat-value').textContent()).toBe('1')
    expect(await page.locator('.stat-card.completed .stat-value').textContent()).toBe('1')
    expect(await page.locator('.stat-card.failed .stat-value').textContent()).toBe('1')

    await page.getByRole('button', { name: 'Failed', exact: true }).click()
    expect(await page.locator('.job-row').count()).toBe(1)
    expect(await page.getByText('ELDEN RING', { exact: true }).isVisible()).toBe(true)
    const issueButton = page.getByRole('button', { name: 'See issue for ELDEN RING' })
    expect(await issueButton.isVisible()).toBe(true)
    await issueButton.hover()
    expect((await page.getByRole('tooltip').textContent())?.trim()).toBe('See issue')

    await issueButton.click()
    const issueDialog = page.getByRole('dialog', { name: 'Job issue' })
    await issueDialog.waitFor()
    expect(await issueDialog.getByText('The scrape failed after three attempts').isVisible()).toBe(
      true
    )
    await page.keyboard.press('Escape')
    await issueDialog.waitFor({ state: 'hidden' })
    expect(await issueButton.evaluate((element) => element === document.activeElement)).toBe(true)

    await page.getByRole('button', { name: 'All', exact: true }).click()
    await page.getByLabel('Search jobs').fill('portal')
    expect(await page.locator('.job-row').count()).toBe(1)
    expect(await page.getByText('Portal 2', { exact: true }).isVisible()).toBe(true)

    await page.getByLabel('Search jobs').fill('stardew')
    const inProgressDelete = page
      .getByRole('row')
      .filter({ hasText: 'Stardew Valley' })
      .getByRole('button', { name: 'Delete' })
    expect(await inProgressDelete.isDisabled()).toBe(true)
  })

  it('views audit entries and sends user, action, and date filters to the server', async () => {
    const page = await createPage('/admin')
    await mockJobs(page, [])
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
    expect(await page.getByText(queuedJob.job_id, { exact: true }).isVisible()).toBe(true)
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
    expect(await page.getByText(queuedJob.job_id, { exact: true }).isVisible()).toBe(true)
  })

  it('searches for a game and queues the selected job type', async () => {
    const page = await createPage('/admin')
    await mockJobs(page, [])
    await page.route('**/api/steam/games?*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(portal2SearchResponse),
      })
    })

    let queueRequestBody: unknown
    await page.route('**/api/jobs/queue', async (route) => {
      queueRequestBody = route.request().postDataJSON()
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(queuedSummaryJobResponse),
      })
    })

    await login(page)
    await page.getByRole('button', { name: 'Run job', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Run job' })
    await dialog.waitFor()
    expect(
      await page.getByLabel('Search game').evaluate((element) => element === document.activeElement)
    ).toBe(true)

    await page.getByLabel('Search game').fill(portal2SearchItem.name)
    await page.getByRole('option', { name: portal2SearchItem.name }).click()
    await page.getByLabel('Job type').selectOption(queuedSummaryJobRequest.job_type)
    const queueResponse = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/api/jobs/queue'
    )
    await dialog.getByRole('button', { name: 'Run job', exact: true }).click()

    expect((await queueResponse).status()).toBe(201)
    expect(queueRequestBody).toEqual(queuedSummaryJobRequest)
    expect(await dialog.isVisible()).toBe(false)
  })

  it('confirms and deletes a deletable job', async () => {
    const page = await createPage('/admin')
    await mockJobs(page, [queuedJob])
    const deleteEndpoint = '/api/jobs/queued-job-1111'

    let deletedPath = ''
    await page.route(`**${deleteEndpoint}`, async (route) => {
      deletedPath = new URL(route.request().url()).pathname
      await route.fulfill({ status: 204 })
    })
    page.on('dialog', (dialog) => dialog.accept())

    await login(page)
    const jobRow = page.getByRole('row').filter({ hasText: 'Portal 2' })
    const deleteResponse = page.waitForResponse(
      (response) => new URL(response.url()).pathname === deleteEndpoint
    )
    await jobRow.getByRole('button', { name: 'Delete' }).click()
    expect((await deleteResponse).status()).toBe(204)
    await jobRow.waitFor({ state: 'hidden' })

    expect(deletedPath).toBe(deleteEndpoint)
    expect(await jobRow.isVisible()).toBe(false)
    expect(await page.getByText('Showing 0–0 of 0 jobs').isVisible()).toBe(true)
  })
})
