import Button from '@material-ui/core/Button';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormGroup from '@material-ui/core/FormGroup';
import LinearProgress from '@material-ui/core/LinearProgress';
import makeStyles from '@material-ui/core/styles/makeStyles';
import useTheme from '@material-ui/core/styles/useTheme';
import Switch from '@material-ui/core/Switch';
import PlaylistAddIcon from '@material-ui/icons/PlaylistAdd';
import { useSnackbar } from 'notistack';
import React, { useState } from 'react';
import { DragDropContext, Droppable, DropResult } from 'react-beautiful-dnd';

import {
  Question,
  QuestionaryStep,
  QuestionTemplateRelation,
} from 'generated/sdk';
import { usePersistQuestionaryEditorModel } from 'hooks/questionary/usePersistQuestionaryEditorModel';
import QuestionaryEditorModel, {
  Event,
  EventType,
} from 'models/QuestionaryEditorModel';
import {
  getQuestionaryStepByTopicId,
  getTopicById,
} from 'models/QuestionaryFunctions';
import { StyledPaper } from 'styles/StyledComponents';
import { randomNumberBetween } from 'utils/Math';

import QuestionEditor from './forms/QuestionEditor';
import QuestionTemplateRelationEditor from './forms/QuestionTemplateRelationEditor';
import { QuestionPicker } from './QuestionPicker';
import { TemplateMetadataEditor } from './TemplateMetadataEditor';
import QuestionaryEditorTopic from './TemplateTopicEditor';

export default function TemplateEditor() {
  const { enqueueSnackbar } = useSnackbar();
  const [
    selectedQuestionTemplateRelation,
    setSelectedQuestionTemplateRelation,
  ] = useState<QuestionTemplateRelation | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(
    null
  );
  const [questionPickerTopicId, setQuestionPickerTopicId] = useState<
    number | null
  >(null);
  const reducerMiddleware = () => {
    return (next: Function) => (action: Event) => {
      next(action);
      switch (action.type) {
        case EventType.SERVICE_ERROR_OCCURRED:
          enqueueSnackbar(action.payload, { variant: 'error' });
          break;

        case EventType.QUESTION_CREATED:
          setSelectedQuestion(action.payload);
          break;

        case EventType.PICK_QUESTION_REQUESTED:
          setQuestionPickerTopicId(action.payload.topic.id);
          break;

        case EventType.OPEN_QUESTION_EDITOR:
          setSelectedQuestion(action.payload);
          break;

        case EventType.OPEN_QUESTIONREL_EDITOR:
          setSelectedQuestionTemplateRelation(action.payload);
          break;

        case EventType.QUESTION_PICKER_NEW_QUESTION_CLICKED:
          setQuestionPickerTopicId(action.payload.topic.id);
          break;
      }
    };
  };
  const { persistModel, isLoading } = usePersistQuestionaryEditorModel();
  const { state, dispatch } = QuestionaryEditorModel([
    persistModel,
    reducerMiddleware,
  ]);

  const [isTopicReorderMode, setIsTopicReorderMode] = useState(false);

  const theme = useTheme();
  const classes = makeStyles(() => ({
    modalContainer: {
      backgroundColor: 'white',
    },
    centeredButton: {
      display: 'flex',
      margin: '10px auto',
    },
  }))();

  const getTopicListStyle = (isDraggingOver: boolean) => ({
    background: isDraggingOver
      ? theme.palette.primary.light
      : theme.palette.grey[100],
    transition: 'all 500ms cubic-bezier(0.190, 1.000, 0.220, 1.000)',
    display: 'flex',
  });

  const onDragEnd = (result: DropResult): void => {
    if (
      !result.destination ||
      (result.destination.droppableId === result.source.droppableId &&
        result.destination.index === result.source.index)
    ) {
      return;
    }

    const isDraggingQuestion = result.type === 'field';
    const isDraggingTopic = result.type === 'topic';

    if (isDraggingQuestion) {
      const dragSource = result.source;
      const dragDestination = result.destination;
      const isDraggingFromQuestionDrawerToTopic =
        dragSource.droppableId === 'questionPicker' &&
        dragDestination?.droppableId !== 'questionPicker';
      const isDraggingFromTopicToQuestionDrawer =
        dragDestination?.droppableId === 'questionPicker' &&
        dragSource.droppableId !== 'questionPicker';
      const isReorderingInsideTopics =
        dragDestination?.droppableId !== 'questionPicker' &&
        dragSource.droppableId !== 'questionPicker';

      if (isDraggingFromQuestionDrawerToTopic) {
        const questionId =
          state.complementaryQuestions[dragSource.index].proposalQuestionId;
        const topicId = dragDestination?.droppableId
          ? +dragDestination.droppableId
          : undefined;

        const topic = getTopicById(state.steps, topicId as number);

        const previousField =
          topic.fields[(dragDestination?.index as number) - 1];
        const nextField = topic.fields[dragDestination?.index as number];

        const sortOrder = randomNumberBetween(
          previousField?.sortOrder,
          nextField?.sortOrder
        );

        if (topicId && questionId) {
          dispatch({
            type: EventType.CREATE_QUESTION_REL_REQUESTED,
            payload: {
              topicId,
              questionId,
              sortOrder,
              templateId: state.templateId,
            },
          });
        }
      } else if (isDraggingFromTopicToQuestionDrawer) {
        const topicId = parseInt(dragSource.droppableId);
        const step = getQuestionaryStepByTopicId(
          state.steps,
          topicId
        ) as QuestionaryStep;
        const question = step.fields[dragSource.index].question;
        dispatch({
          type: EventType.DELETE_QUESTION_REL_REQUESTED,
          payload: {
            fieldId: question.proposalQuestionId,
            templateId: state.templateId,
          },
        });
      } else if (isReorderingInsideTopics) {
        dispatch({
          type: EventType.REORDER_QUESTION_REL_REQUESTED,
          payload: { source: result.source, destination: result.destination },
        });
      }
    }
    if (isDraggingTopic) {
      dispatch({
        type: EventType.REORDER_TOPIC_REQUESTED,
        payload: { source: result.source, destination: result.destination },
      });
    }
  };

  const getContainerStyle = () => {
    return isLoading || state.templateId === 0
      ? {
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: 0.5,
        }
      : {};
  };

  const progressJsx = isLoading ? <LinearProgress /> : null;
  const newTopicFallbackButton =
    state.steps.length === 0 ? (
      <Button
        variant="outlined"
        color="primary"
        className={classes.centeredButton}
        onClick={(): void =>
          dispatch({
            type: EventType.CREATE_TOPIC_REQUESTED,
            payload: { sortOrder: 0.5, isFirstTopic: true },
          })
        }
      >
        <PlaylistAddIcon />
        &nbsp; Add topic
      </Button>
    ) : null;

  const enableReorderTopicsToggle =
    state.steps.length > 1 ? (
      <FormGroup
        row
        style={{ justifyContent: 'flex-end', paddingBottom: '25px' }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={isTopicReorderMode}
              onChange={(): void => setIsTopicReorderMode(!isTopicReorderMode)}
              color="primary"
            />
          }
          label="Reorder topics mode"
        />
      </FormGroup>
    ) : null;

  return (
    <>
      <TemplateMetadataEditor dispatch={dispatch} template={state} />
      <StyledPaper style={getContainerStyle()}>
        {progressJsx}
        {enableReorderTopicsToggle}
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="topics" direction="horizontal" type="topic">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                style={getTopicListStyle(snapshot.isDraggingOver)}
              >
                {state.steps.map((step, index) => {
                  const questionPicker =
                    step.topic.id === questionPickerTopicId ? (
                      <QuestionPicker
                        topic={step.topic}
                        dispatch={dispatch}
                        template={state}
                        key="questionPicker"
                        closeMe={() => {
                          setQuestionPickerTopicId(null);
                        }}
                        id="questionPicker"
                      />
                    ) : null;

                  return (
                    <>
                      <QuestionaryEditorTopic
                        data={step}
                        dispatch={dispatch}
                        index={index}
                        key={step.topic.id}
                        dragMode={isTopicReorderMode}
                      />
                      {questionPicker}
                    </>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        {newTopicFallbackButton}
      </StyledPaper>

      <QuestionTemplateRelationEditor
        field={selectedQuestionTemplateRelation}
        dispatch={dispatch}
        closeMe={() => setSelectedQuestionTemplateRelation(null)}
        template={state}
      />

      <QuestionEditor
        field={selectedQuestion}
        dispatch={dispatch}
        closeMe={() => setSelectedQuestion(null)}
        template={state}
      />
    </>
  );
}
