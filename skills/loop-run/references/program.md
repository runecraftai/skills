# Phase Contract: <phase-id> — <title>

risk: standard

## Objective

<what this phase must achieve — one sentence>

## Scope (allowed files)

- <glob or path>

## Out of Scope

- <explicit — never touch>

## Acceptance Criteria (BDD)

- AC-1:
    Given <precondition>
    When  <action>
    Then  <observable, checkable outcome>
- AC-2:
    Given <precondition>
    When  <action>
    Then  <observable, checkable outcome>

## Verify Method

kind: programmatic
command: "<cmd that exits 0/≠0 or prints a number>"
sensor: on

## Impact

impact: internal

## Mandatory sub-steps

contract → apply → measure → judge → learn

## Budget & Stop

max_iterations: 3
stop_criterion: "<when to stop even if not perfect>"
