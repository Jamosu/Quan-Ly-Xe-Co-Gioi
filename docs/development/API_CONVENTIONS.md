# API conventions

Base path: `/api`. Controllers use validated DTOs and Nest exceptions; successful responses use the application response envelope. JWT may arrive through bearer token or `access_token` cookie.

Use plural resource paths and explicit DTOs. Do not expose `passwordHash`. Keep Prisma enums as canonical API values and map labels in the frontend client.
