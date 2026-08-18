import { useState } from "react"

import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface StationComboboxProps {
  id?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  stations: string[]
  placeholder?: string
}

/**
 * A free-text input that suggests previously used fuel station names.
 * Typing a name that doesn't match any suggestion is a valid value —
 * suggestions are a shortcut, not a constraint.
 *
 * The input itself is the popover trigger, with `nativeButton={false}` so
 * base-ui doesn't attach button-style keyboard handling (which would
 * otherwise swallow keystrokes like Space) to what needs to stay a normal
 * text field.
 */
export function StationCombobox({
  id,
  value,
  onChange,
  onBlur,
  stations,
  placeholder,
}: StationComboboxProps) {
  const [open, setOpen] = useState(false)

  const query = value.trim().toLowerCase()
  const filtered = query
    ? stations.filter((station) => station.toLowerCase().includes(query))
    : stations
  const hasExactMatch = stations.some((station) => station.toLowerCase() === query)
  const showPopover = open && stations.length > 0

  return (
    <Popover open={showPopover} onOpenChange={setOpen}>
      <PopoverTrigger
        nativeButton={false}
        render={
          <Input
            id={id}
            value={value}
            placeholder={placeholder ?? "e.g. Shell, HP, Indian Oil"}
            autoComplete="off"
            role="combobox"
            aria-controls="station-combobox-list"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              onChange(event.target.value)
              setOpen(true)
            }}
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              if (event.key === "Escape") setOpen(false)
            }}
            onBlur={onBlur}
          />
        }
      />
      <PopoverContent
        className="w-(--anchor-width) p-0"
        align="start"
        initialFocus={false}
        finalFocus={false}
      >
        <Command id="station-combobox-list" shouldFilter={false}>
          <CommandList>
            {filtered.length === 0 && <CommandEmpty>No matching stations.</CommandEmpty>}
            {filtered.length > 0 && (
              <CommandGroup heading="Previous stations">
                {filtered.map((station) => (
                  <CommandItem
                    key={station}
                    value={station}
                    onSelect={() => {
                      onChange(station)
                      setOpen(false)
                    }}
                  >
                    {station}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {value.trim() && !hasExactMatch && (
              <CommandGroup heading="New station">
                <CommandItem
                  value={`__create__${value}`}
                  onSelect={() => {
                    onChange(value.trim())
                    setOpen(false)
                  }}
                >
                  Use &ldquo;{value.trim()}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
