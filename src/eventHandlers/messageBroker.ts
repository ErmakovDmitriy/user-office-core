import { logger } from '@esss-swap/duo-logger';
import { Queue, RabbitMQMessageBroker } from '@esss-swap/duo-message-broker';
import { container } from 'tsyringe';

import { Tokens } from '../config/Tokens';
import { CallDataSource } from '../datasources/CallDataSource';
import { InstrumentDataSource } from '../datasources/InstrumentDataSource';
import { ProposalDataSource } from '../datasources/ProposalDataSource';
import { ProposalSettingsDataSource } from '../datasources/ProposalSettingsDataSource';
import { UserDataSource } from '../datasources/UserDataSource';
import { ApplicationEvent } from '../events/applicationEvents';
import { Event } from '../events/event.enum';
import { EventHandler } from '../events/eventBus';
import { AllocationTimeUnits } from '../models/Call';
import { Proposal, ProposalEndStatus } from '../models/Proposal';
import { ProposalStatusDefaultShortCodes } from '../models/ProposalStatus';

type ProposalMessageData = {
  proposalPk: number;
  shortCode: string;
  title: string;
  abstract: string;
  members: { firstName: string; lastName: string; email: string }[];
  proposer?: { firstName: string; lastName: string; email: string };
};

export function createPostToQueueHandler() {
  // return the mapped implementation
  return container.resolve<EventHandler<ApplicationEvent>>(
    Tokens.PostToMessageQueue
  );
}

const getProposalMessageData = async (proposal: Proposal) => {
  const userDataSource = container.resolve<UserDataSource>(
    Tokens.UserDataSource
  );

  const proposalUsers = await userDataSource.getProposalUsersFull(
    proposal.primaryKey
  );

  const messageData: ProposalMessageData = {
    proposalPk: proposal.primaryKey,
    shortCode: proposal.proposalId,
    title: proposal.title,
    abstract: proposal.abstract,
    members: proposalUsers.map((proposalUser) => ({
      firstName: proposalUser.firstname,
      lastName: proposalUser.lastname,
      email: proposalUser.email,
    })),
  };

  const proposer = await userDataSource.getUser(proposal.proposerId);

  if (proposer) {
    messageData.proposer = {
      firstName: proposer.firstname,
      lastName: proposer.lastname,
      email: proposer.email,
    };
  }

  return JSON.stringify(messageData);
};

const getSecondsPerAllocationTimeUnit = (
  timeAllocation: number,
  unit: AllocationTimeUnits
) => {
  // NOTE: Default AllocationTimeUnit is 'Day'. The UI supports Days and Hours.
  switch (unit) {
    case AllocationTimeUnits.Hour:
      return timeAllocation * 60 * 60;
    default:
      return timeAllocation * 24 * 60 * 60;
  }
};

export function createPostToRabbitMQHandler() {
  const proposalSettingsDataSource = container.resolve<ProposalSettingsDataSource>(
    Tokens.ProposalSettingsDataSource
  );

  const proposalDataSource = container.resolve<ProposalDataSource>(
    Tokens.ProposalDataSource
  );
  const instrumentDataSource = container.resolve<InstrumentDataSource>(
    Tokens.InstrumentDataSource
  );
  const callDataSource = container.resolve<CallDataSource>(
    Tokens.CallDataSource
  );

  const rabbitMQ = new RabbitMQMessageBroker();

  rabbitMQ.setup({
    hostname: process.env.RABBITMQ_HOSTNAME,
    username: process.env.RABBITMQ_USERNAME,
    password: process.env.RABBITMQ_PASSWORD,
  });

  return async (event: ApplicationEvent) => {
    // if the original method failed
    // there is no point of publishing any event
    if (event.isRejection) {
      return;
    }

    switch (event.type) {
      case Event.PROPOSAL_STATUS_CHANGED_BY_WORKFLOW:
      case Event.PROPOSAL_STATUS_CHANGED_BY_USER: {
        const proposal = event.proposal;
        const proposalStatus = await proposalSettingsDataSource.getProposalStatus(
          proposal.statusId
        );

        // if the new status isn't 'SCHEDULING' ignore the event
        if (
          proposalStatus?.shortCode !==
          ProposalStatusDefaultShortCodes.SCHEDULING
        ) {
          logger.logDebug(
            `Proposal '${proposal.primaryKey}' status isn't 'SCHEDULING', skipping`,
            { proposal, proposalStatus }
          );

          return;
        }

        const instrument = await instrumentDataSource.getInstrumentByProposalPk(
          proposal.primaryKey
        );

        if (!instrument) {
          logger.logWarn(
            `Proposal '${proposal.primaryKey}' has no instrument`,
            {
              proposal,
            }
          );

          return;
        }

        const call = await callDataSource.getCall(proposal.callId);

        if (!call) {
          logger.logWarn(`Proposal '${proposal.primaryKey}' has no call`, {
            proposal,
          });

          return;
        }

        const proposalAllocatedTime = getSecondsPerAllocationTimeUnit(
          proposal.managementTimeAllocation,
          call.allocationTimeUnit
        );

        // NOTE: maybe use shared types?
        const message = {
          proposalPk: proposal.primaryKey,
          callId: proposal.callId,
          allocatedTime: proposalAllocatedTime,
          instrumentId: instrument.id,
        };

        const json = JSON.stringify(message);

        await rabbitMQ.sendMessage(Queue.PROPOSAL, event.type, json);

        logger.logDebug(
          'Proposal event successfully sent to the message broker',
          { eventType: event.type, json }
        );

        break;
      }
      case Event.PROPOSAL_MANAGEMENT_DECISION_SUBMITTED: {
        switch (event.proposal.finalStatus) {
          case ProposalEndStatus.ACCEPTED:
            const json = await getProposalMessageData(event.proposal);

            await rabbitMQ.sendBroadcast(Event.PROPOSAL_ACCEPTED, json);
            break;
          default:
            break;
        }
        break;
      }

      case Event.PROPOSAL_UPDATED: {
        const json = await getProposalMessageData(event.proposal);

        await rabbitMQ.sendBroadcast(Event.PROPOSAL_UPDATED, json);
        break;
      }
      case Event.PROPOSAL_CREATED: {
        const json = await getProposalMessageData(event.proposal);

        await rabbitMQ.sendBroadcast(Event.PROPOSAL_CREATED, json);
        break;
      }
      case Event.TOPIC_ANSWERED: {
        const proposal = await proposalDataSource.getProposals({
          questionaryIds: [event.questionarystep.questionaryId],
        });

        if (proposal.proposals.length !== 1) {
          // this checks if the questionary answered is attached to proposal
          return;
        }
        const answers = event.questionarystep.fields.map((field) => {
          return {
            proposalId: proposal.proposals[0].proposalId,
            question: field.question.question,
            questionId: field.question.naturalKey,
            dataType: field.question.dataType,
            answer: field.value,
          };
        });

        const json = JSON.stringify(answers);
        await rabbitMQ.sendBroadcast(Event.TOPIC_ANSWERED, json);
        break;
      }
    }
  };
}

export function createSkipPostingHandler() {
  return async (event: ApplicationEvent) => {
    // no op
  };
}
