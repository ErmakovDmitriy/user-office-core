import produce from 'immer';
import { Reducer, useCallback, useEffect } from 'react';
import { useParams } from 'react-router';

import { ProposalTemplate, Question, QuestionRel } from '../generated/sdk';
import { useDataApi } from '../hooks/useDataApi';
import useReducerWithMiddleWares from '../utils/useReducerWithMiddleWares';
import {
  getFieldById,
  getQuestionaryStepByTopicId,
  getTopicById,
} from './ProposalModelFunctions';

export enum EventType {
  READY,

  CREATE_QUESTION_REQUESTED,
  UPDATE_QUESTION_REQUESTED,
  DELETE_QUESTION_REQUESTED,
  QUESTION_CREATED,
  QUESTION_UPDATED,

  CREATE_QUESTION_REL_REQUESTED,
  UPDATE_QUESTION_REL_REQUESTED,
  DELETE_QUESTION_REL_REQUESTED,
  QUESTION_REL_CREATED,
  QUESTION_REL_UPDATED,
  QUESTION_REL_DELETED,

  REORDER_QUESTION_REL_REQUESTED,

  CREATE_TOPIC_REQUESTED,
  DELETE_TOPIC_REQUESTED,
  TOPIC_CREATED,
  UPDATE_TOPIC_TITLE_REQUESTED,

  REORDER_TOPIC_REQUESTED,
  PICK_QUESTION_REQUESTED,
  QUESTION_PICKER_NEW_QUESTION_CLICKED,
  SERVICE_ERROR_OCCURRED,
}

export interface Event {
  type: EventType;
  payload: any;
}

export default function QuestionaryEditorModel(middlewares?: Array<Function>) {
  const { templateId } = useParams();
  const blankInitTemplate: ProposalTemplate = {
    steps: [],
    templateId: 0,
    callCount: 0,
    isArchived: false,
    name: 'blank',
    proposalCount: 0,
    complementaryQuestions: [],
  };

  function reducer(state: ProposalTemplate, action: Event): ProposalTemplate {
    return produce(state, draft => {
      switch (action.type) {
        case EventType.READY:
          return action.payload;
        case EventType.REORDER_QUESTION_REL_REQUESTED: {
          if (!action.payload.destination) {
            return draft;
          }

          const from = draft.steps.find(step => {
            return (
              step.topic.id.toString() === action.payload.source.droppableId
            );
          })!;

          const to = draft.steps.find(step => {
            return (
              step.topic.id.toString() ===
              action.payload.destination.droppableId
            );
          })!;

          to.fields.splice(
            action.payload.destination.index,
            0,
            ...from.fields.splice(action.payload.source.index, 1)
          );

          return draft;
        }
        case EventType.REORDER_TOPIC_REQUESTED:
          if (!action.payload.destination) {
            return draft;
          }

          draft.steps.splice(
            action.payload.destination.index,
            0,
            ...draft.steps.splice(action.payload.source.index, 1)
          );

          return draft;
        case EventType.UPDATE_TOPIC_TITLE_REQUESTED:
          getTopicById(draft.steps, action.payload.topicId).topic_title =
            action.payload.title;

          return draft;
        case EventType.UPDATE_QUESTION_REL_REQUESTED: {
          const questionRel: QuestionRel = action.payload.field;
          const questionRelToUpdate = getFieldById(
            state.steps,
            questionRel.question.proposalQuestionId
          );
          if (questionRel && questionRelToUpdate) {
            Object.assign(questionRelToUpdate, questionRel);
          } else {
            console.error(
              'Object(s) are not defined',
              questionRel,
              questionRelToUpdate
            );
          }

          return draft;
        }
        case EventType.UPDATE_QUESTION_REQUESTED: {
          const field: Question = action.payload.field;
          const fieldToUpdate = draft.complementaryQuestions.find(
            question => question.proposalQuestionId === field.proposalQuestionId
          );
          if (field && fieldToUpdate) {
            Object.assign(fieldToUpdate, field);
          } else {
            console.error('Object(s) are not defined', field, fieldToUpdate);
          }

          return draft;
        }

        case EventType.DELETE_TOPIC_REQUESTED: {
          const stepToDelete = getQuestionaryStepByTopicId(
            draft.steps,
            action.payload
          );
          if (!stepToDelete) {
            return;
          }
          const stepIdx = draft.steps.indexOf(stepToDelete);
          draft.steps.splice(stepIdx, 1);

          return draft;
        }
        case EventType.TOPIC_CREATED:
        case EventType.QUESTION_REL_UPDATED:
        case EventType.QUESTION_REL_DELETED:
          return { ...action.payload };
        case EventType.QUESTION_CREATED:
          draft.complementaryQuestions.unshift(action.payload);

          return draft;
        case EventType.QUESTION_REL_CREATED:
          return { ...action.payload };
        case EventType.QUESTION_UPDATED: {
          const question = action.payload as Question;
          Object.assign(
            draft.complementaryQuestions.find(
              curQuestion =>
                curQuestion.proposalQuestionId === question.proposalQuestionId
            ),
            question
          );

          return draft;
        }
      }
    });
  }

  const [state, dispatch] = useReducerWithMiddleWares<
    Reducer<ProposalTemplate, Event>
  >(reducer, blankInitTemplate, middlewares || []);
  const memoizedDispatch = useCallback(dispatch, []); // required to avoid infinite re-render because dispatch function is recreated
  const api = useDataApi();

  useEffect(() => {
    api()
      .getProposalTemplate({ templateId: parseInt(templateId!) })
      .then(data => {
        memoizedDispatch({
          type: EventType.READY,
          payload: data.proposalTemplate,
        });
      });
  }, [api, memoizedDispatch, templateId]);

  return { state, dispatch };
}
