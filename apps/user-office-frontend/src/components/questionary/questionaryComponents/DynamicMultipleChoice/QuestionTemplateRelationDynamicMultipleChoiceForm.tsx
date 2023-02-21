import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import { SelectChangeEvent } from '@mui/material/Select';
import { Field } from 'formik';
import { Checkbox, Select, TextField } from 'formik-mui';
import React, { FC, useState } from 'react';
import * as Yup from 'yup';

import TitledContainer from 'components/common/TitledContainer';
import { QuestionTemplateRelationFormProps } from 'components/questionary/QuestionaryComponentRegistry';
import { SelectionFromOptionsConfig } from 'generated/sdk';

import { QuestionExcerpt } from '../QuestionExcerpt';
import { QuestionTemplateRelationFormShell } from '../QuestionTemplateRelationFormShell';

const columns = [{ title: 'Answer', field: 'answer' }];

export const QuestionTemplateRelationDynamicMultipleChoiceForm: FC<
  QuestionTemplateRelationFormProps
> = (props) => {
  const config = props.questionRel.config as SelectionFromOptionsConfig;
  const [showIsMultipleSelectCheckbox, setShowIsMultipleSelectCheckbox] =
    useState(config.variant === 'dropdown');

  const availableVariantOptions = [
    { label: 'Radio', value: 'radio' },
    { label: 'Dropdown', value: 'dropdown' },
  ];

  return (
    <QuestionTemplateRelationFormShell
      {...props}
      validationSchema={Yup.object().shape({
        config: Yup.object({
          required: Yup.bool(),
          variant: Yup.string().required('Variant is required'),
          url: Yup.string()
            .url('Provide a valid URL that includes the HTTP or HTTPS protocol')
            .required('URL is required'),
        }),
      })}
    >
      {() => (
        <>
          <QuestionExcerpt question={props.questionRel.question} />
          <TitledContainer label="Constraints">
            <FormControlLabel
              control={
                <Field
                  name="config.required"
                  component={Checkbox}
                  type="checkbox"
                  inputProps={{ 'data-cy': 'required' }}
                />
              }
              label="Is required"
            />
          </TitledContainer>

          <TitledContainer label="Options">
            <FormControl fullWidth>
              <InputLabel htmlFor="config.variant" shrink>
                Variant
              </InputLabel>
              <Field
                id="config.variant"
                name="config.variant"
                type="text"
                component={Select}
                data-cy="variant"
                onChange={(e: SelectChangeEvent) => {
                  setShowIsMultipleSelectCheckbox(
                    e.target.value === 'dropdown'
                  );
                }}
              >
                {availableVariantOptions.map(({ value, label }) => {
                  return (
                    <MenuItem value={value} key={value}>
                      {label}
                    </MenuItem>
                  );
                })}
              </Field>
            </FormControl>
            {showIsMultipleSelectCheckbox && (
              <FormControlLabel
                control={
                  <Field
                    name="config.isMultipleSelect"
                    component={Checkbox}
                    type="checkbox"
                    inputProps={{ 'data-cy': 'is-multiple-select' }}
                  />
                }
                label="Is multiple select"
              />
            )}
          </TitledContainer>

          <TitledContainer label="Dynamic URL">
            <FormControl fullWidth>
              <InputLabel htmlFor="config.url" shrink>
                Link
              </InputLabel>
              <Field
                name="config.url"
                id="config.url"
                type="text"
                component={TextField}
                columns={columns}
                fullWidth
                inputProps={{ 'data-cy': 'dynamic-url' }}
              />
            </FormControl>
          </TitledContainer>
        </>
      )}
    </QuestionTemplateRelationFormShell>
  );
};