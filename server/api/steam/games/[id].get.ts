import { defineEventHandler } from 'h3'
import z from 'zod'
import { gameIdSchema } from '../../../backend/api/games/games.schema'
import { NotFoundError } from '../../../backend/errors/NotFoundError'
import { apiHandler, parseParams, useApiDependencies } from '../../../utils/api'

export default defineEventHandler((event) =>
  apiHandler(event, async () => {
    const { id } = await parseParams(event.context.params, z.object({ id: gameIdSchema }))
    const { repositories } = await useApiDependencies()
    return repositories.steamCache.getGameDetails(id).catch(() => {
      throw new NotFoundError('Game not found on Steam')
    })
  })
)
