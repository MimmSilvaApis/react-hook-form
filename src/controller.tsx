import * as React from 'react';
import isUndefined from './utils/isUndefined';
import get from './utils/get';
import set from './utils/set';
import getInputValue from './logic/getInputValue';
import skipValidation from './logic/skipValidation';
import isNameInFieldArray from './logic/isNameInFieldArray';
import { useFormContext } from './useFormContext';
import { VALUE } from './constants';
import { Control } from './types';
import { ControllerProps } from './types';

const Controller = <
  TAs extends
    | React.ReactElement
    | React.ComponentType<any>
    | 'input'
    | 'select'
    | 'textarea',
  TControl extends Control = Control
>({
  name,
  rules,
  as,
  render,
  defaultValue,
  control,
  onFocus,
  ...rest
}: ControllerProps<TAs, TControl>) => {
  const methods = useFormContext();

  if (process.env.NODE_ENV !== 'production') {
    if (!control && !methods) {
      throw new Error(
        '📋 Controller is missing `control` prop. https://react-hook-form.com/api#Controller',
      );
    }
  }

  const {
    defaultValuesRef,
    setValue,
    register,
    unregister,
    trigger,
    mode,
    reValidateMode: { isReValidateOnBlur, isReValidateOnChange },
    formStateRef: {
      current: { isSubmitted, touched },
    },
    updateFormState,
    readFormStateRef,
    fieldsRef,
    fieldArrayNamesRef,
    shallowFieldsStateRef,
  } = control || methods.control;
  const isNotFieldArray = !isNameInFieldArray(fieldArrayNamesRef.current, name);
  const getInitialValue = () =>
    !isUndefined(get(shallowFieldsStateRef.current, name)) && isNotFieldArray
      ? get(shallowFieldsStateRef.current, name)
      : isUndefined(defaultValue)
      ? get(defaultValuesRef.current, name)
      : defaultValue;
  const [value, setInputStateValue] = React.useState(getInitialValue());
  const valueRef = React.useRef(value);
  const ref = React.useRef({
    focus: () => null,
  });
  const onFocusRef = React.useRef(onFocus || (() => ref.current.focus()));

  const shouldValidate = React.useCallback(
    (isBlurEvent?: boolean) =>
      !skipValidation({
        isBlurEvent,
        isReValidateOnBlur,
        isReValidateOnChange,
        isSubmitted,
        isTouched: !!get(touched, name),
        ...mode,
      }),
    [
      isReValidateOnBlur,
      isReValidateOnChange,
      isSubmitted,
      touched,
      name,
      mode,
    ],
  );

  const commonTask = React.useCallback(([event]: any[]) => {
    const data = getInputValue(event);
    setInputStateValue(data);
    valueRef.current = data;
    return data;
  }, []);

  const registerField = React.useCallback(() => {
    if (process.env.NODE_ENV !== 'production' && !name) {
      return console.warn(
        '📋 Field is missing `name` prop. https://react-hook-form.com/api#Controller',
      );
    }

    if (fieldsRef.current[name]) {
      fieldsRef.current[name] = {
        ref: fieldsRef.current[name]!.ref,
        ...rules,
      };
    } else {
      register(
        Object.defineProperty(
          {
            name,
            focus: onFocusRef.current,
          },
          VALUE,
          {
            set(data) {
              setInputStateValue(data);
              valueRef.current = data;
            },
            get() {
              return valueRef.current;
            },
          },
        ),
        rules,
      );
      if (isNotFieldArray && !get(defaultValuesRef.current, name)) {
        setInputStateValue(getInitialValue());
      }
    }
  }, [rules, name, register]);

  React.useEffect(() => () => unregister(name), [unregister, name]);

  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      if (isUndefined(value)) {
        console.warn(
          `📋 ${name} is missing in the 'defaultValue' prop of either its Controller (https://react-hook-form.com/api#Controller) or useForm (https://react-hook-form.com/api#useForm)`,
        );
      }

      if ((!as && !render) || (as && render)) {
        console.warn(
          `📋 ${name} Controller should use either the 'as' or 'render' prop, not both. https://react-hook-form.com/api#Controller`,
        );
      }

      if (!isNotFieldArray && isUndefined(defaultValue)) {
        console.warn(
          '📋 Controller is missing `defaultValue` prop when using `useFieldArray`. https://react-hook-form.com/api#Controller',
        );
      }
    }

    registerField();
  }, [registerField]);

  React.useEffect(() => {
    if (!fieldsRef.current[name]) {
      registerField();
      if (isNotFieldArray) {
        setInputStateValue(getInitialValue());
      }
    }
  });

  const onBlur = React.useCallback(() => {
    if (readFormStateRef.current.touched && !get(touched, name)) {
      set(touched, name, true);
      updateFormState({
        touched,
      });
    }

    if (shouldValidate(true)) {
      trigger(name);
    }
  }, [
    name,
    touched,
    updateFormState,
    shouldValidate,
    trigger,
    readFormStateRef,
  ]);

  const onChange = React.useCallback(
    (...event: any[]) =>
      setValue(name, commonTask(event), {
        shouldValidate: shouldValidate(),
        shouldDirty: true,
      }),
    [setValue, commonTask, name, shouldValidate],
  );

  const commonProps = {
    onChange,
    onBlur,
    name,
    value,
    ref,
  };

  const props = {
    ...rest,
    ...commonProps,
  };

  return as
    ? React.isValidElement(as)
      ? React.cloneElement(as, props)
      : React.createElement(as as string, props as any)
    : render
    ? render(commonProps)
    : null;
};

export { Controller };
