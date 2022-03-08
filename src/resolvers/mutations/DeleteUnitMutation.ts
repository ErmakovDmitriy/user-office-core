import { Arg, Ctx, Mutation, Resolver } from 'type-graphql';

import { ResolverContext } from '../../context';
import { UnitResponseWrap } from '../types/CommonWrappers';
import { wrapResponse } from '../wrapResponse';

@Resolver()
export class DeleteUnitlMutation {
  @Mutation(() => UnitResponseWrap)
  deleteUnit(
    @Arg('id', () => String) id: string,
    @Ctx() context: ResolverContext
  ) {
    return wrapResponse(
      context.mutations.admin.deleteUnit(context.user, id),
      UnitResponseWrap
    );
  }
}
