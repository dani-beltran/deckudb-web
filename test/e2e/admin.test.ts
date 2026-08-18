import { createPage, type NuxtPage, setup, url as testUrl } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { getDebugConfig } from './helpers'

const ADMIN_USERNAME = process.env.NUXT_ADMIN_USERNAME ?? process.env.ADMIN_USERNAME ?? 'admin'
const ADMIN_PASSWORD =
  process.env.NUXT_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD ?? 'test-admin-password'
const DEBUG = process.env.E2E_TESTS_DEBUG === 'true'
const LOGIN_ENDPOINT = '/api/admin/auth/login'

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
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 503, statusMessage: 'Service Unavailable' }),
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

    expect(failedResponse.status()).toBe(503)
    expect((await alert.textContent())?.trim()).toBe('Service Unavailable')
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
})
