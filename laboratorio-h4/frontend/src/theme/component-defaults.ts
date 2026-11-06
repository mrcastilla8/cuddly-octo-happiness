import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Drawer,
  Loader,
  Skeleton,
  FileInput,
  Input,
  InputWrapper,
  InputPlaceholder,
  Modal,
  MultiSelect,
  NavLink,
  NumberInput,
  Pagination,
  Paper,
  Radio,
  RadioCard,
  Select,
  Table,
  Tabs,
  Stepper,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { tokens } from "./tokens";
import classes from "./primitives.module.css";

export const componentDefaults = {
  Button: Button.extend({
    defaultProps: { size: "md", radius: "sm", variant: "filled" },
    classNames: (_, props) => ({
      root: `${classes.button} ${props.color === "danger" ? classes.destructive : ""}`,
      label: classes.buttonLabel,
    }),
  }),
  ActionIcon: ActionIcon.extend({
    defaultProps: { size: 32, variant: "subtle" },
    classNames: { root: classes.actionIcon },
  }),
  Loader: Loader.extend({ defaultProps: { color: tokens.color.secondary } }),
  Skeleton: Skeleton.extend({ classNames: { root: classes.skeleton } }),
  Input: Input.extend({
    defaultProps: { size: "md" },
    classNames: { input: classes.input, wrapper: classes.inputWrapper },
  }),
  InputWrapper: InputWrapper.extend({
    defaultProps: {
      inputWrapperOrder: ["label", "input", "description", "error"],
    },
    classNames: {
      label: classes.label,
      description: classes.help,
      error: classes.help,
    },
  }),
  InputPlaceholder: InputPlaceholder.extend({
    styles: { placeholder: { color: tokens.color.secondary } },
  }),
  TextInput: TextInput.extend({ defaultProps: { size: "md" } }),
  FileInput: FileInput.extend({ defaultProps: { size: "md" } }),
  NumberInput: NumberInput.extend({ defaultProps: { size: "md" } }),
  Textarea: Textarea.extend({
    defaultProps: { size: "md", autosize: true, minRows: 3 },
    classNames: { input: classes.textarea },
  }),
  Select: Select.extend({
    defaultProps: {
      size: "md",
      maxDropdownHeight: 288,
      comboboxProps: { zIndex: tokens.layer.dialogFloating },
    },
    classNames: { dropdown: classes.dropdown, option: classes.option },
  }),
  MultiSelect: MultiSelect.extend({
    defaultProps: {
      size: "md",
      maxDropdownHeight: 288,
      comboboxProps: { zIndex: tokens.layer.dialogFloating },
    },
    classNames: { dropdown: classes.dropdown, option: classes.option },
  }),
  Checkbox: Checkbox.extend({
    defaultProps: { size: "md" },
    vars: (_, props) => ({
      root: { "--checkbox-size": props.size === "sm" ? "18px" : "20px" },
    }),
    classNames: {
      input: classes.choice,
      icon: classes.choiceIcon,
      body: classes.choiceBody,
      label: classes.choiceLabel,
    },
  }),
  Radio: Radio.extend({
    defaultProps: { size: "md" },
    vars: () => ({ root: { "--radio-size": "20px" } }),
    classNames: {
      radio: classes.choice,
      icon: classes.choiceIcon,
      body: classes.choiceBody,
      label: classes.choiceLabel,
    },
  }),
  RadioCard: RadioCard.extend({ classNames: { card: classes.radioCard } }),
  Tabs: Tabs.extend({
    classNames: { tab: classes.tab, list: classes.tabList },
  }),
  Stepper: Stepper.extend({
    defaultProps: { iconSize: 32, allowNextStepsSelect: false },
    classNames: {
      stepIcon: classes.stepIcon,
      stepLabel: classes.stepLabel,
      stepDescription: classes.stepDescription,
      separator: classes.stepSeparator,
    },
  }),
  Paper: Paper.extend({
    defaultProps: { radius: "md", shadow: "none", withBorder: true },
    styles: {
      root: {
        borderColor: tokens.color.border,
        background: tokens.color.surface,
      },
    },
  }),
  Title: Title.extend({ classNames: { root: classes.title } }),
  Badge: Badge.extend({
    defaultProps: { size: "sm", radius: "full" },
    classNames: { root: classes.badge },
    styles: {
      label: {
        whiteSpace: "normal",
        overflow: "visible",
        textOverflow: "clip",
      },
    },
  }),
  Table: Table.extend({
    defaultProps: { horizontalSpacing: "md", verticalSpacing: "sm" },
    classNames: { table: classes.table, th: classes.th, td: classes.td },
  }),
  Pagination: Pagination.extend({
    defaultProps: { size: 32, radius: "sm", gap: 8 },
    classNames: { control: classes.pagination },
  }),
  Modal: Modal.extend({
    defaultProps: {
      centered: true,
      size: 480,
      padding: "lg",
      radius: "lg",
      zIndex: tokens.layer.dialog,
      overlayProps: { backgroundOpacity: 0.4, color: tokens.color.ink },
      transitionProps: { duration: 160 },
      closeButtonProps: { "aria-label": "Cerrar diálogo", size: 40 },
    },
    classNames: {
      content: classes.dialog,
      title: classes.dialogTitle,
      header: classes.dialogHeader,
    },
  }),
  Drawer: Drawer.extend({
    defaultProps: {
      position: "right",
      size: 480,
      padding: "lg",
      zIndex: tokens.layer.dialog,
      overlayProps: { backgroundOpacity: 0.4, color: tokens.color.ink },
      closeButtonProps: { "aria-label": "Cerrar panel", size: 40 },
    },
    classNames: { title: classes.dialogTitle },
    styles: {
      content: {
        background: tokens.color.surface,
        boxShadow: tokens.shadow.dialog,
      },
      header: { background: tokens.color.surface },
    },
  }),
  Tooltip: Tooltip.extend({
    defaultProps: {
      withArrow: false,
      position: "top",
      zIndex: tokens.layer.dialogFloating,
    },
    styles: {
      tooltip: {
        background: tokens.color.ink,
        color: tokens.color.cloud,
        padding: 8,
        maxWidth: 280,
        whiteSpace: "normal",
      },
    },
  }),
  NavLink: NavLink.extend({
    classNames: { root: classes.navLink, label: classes.navLabel },
  }),
  Alert: Alert.extend({ defaultProps: { radius: "md", p: "md" } }),
};
