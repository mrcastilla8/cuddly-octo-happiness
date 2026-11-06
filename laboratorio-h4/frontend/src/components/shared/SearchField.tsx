import { ActionIcon, TextInput } from "@mantine/core";
import { IconSearch, IconX } from "@tabler/icons-react";

export interface SearchFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}
export function SearchField({
  label,
  value,
  onChange,
  placeholder,
}: SearchFieldProps) {
  return (
    <TextInput
      label={label}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      placeholder={placeholder}
      leftSection={<IconSearch size={20} stroke={2} aria-hidden="true" />}
      rightSection={
        value ? (
          <ActionIcon
            aria-label={`Limpiar ${label.toLocaleLowerCase("es")}`}
            onClick={() => onChange("")}
          >
            <IconX size={16} stroke={2} aria-hidden="true" />
          </ActionIcon>
        ) : undefined
      }
    />
  );
}
