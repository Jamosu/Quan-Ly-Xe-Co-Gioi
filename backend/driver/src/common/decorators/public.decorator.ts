import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** @deprecated Operational APIs are authenticated by default. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, false);
export const AllowAnonymous = () => SetMetadata(IS_PUBLIC_KEY, true);
