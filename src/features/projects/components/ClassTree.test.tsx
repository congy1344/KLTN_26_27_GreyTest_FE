// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ClassTree } from './ClassTree';
import type { JavaClassInfo } from '../types';

const classes: JavaClassInfo[] = [
  {
    id: 1,
    packageName: 'com.example',
    className: 'UserController',
    qualifiedName: 'com.example.UserController',
    classType: 'CONTROLLER',
    filePath: 'UserController.java',
    sourceCode: 'class UserController { User findUser(Long id) { return null; } }',
    methods: [
      {
        id: 2,
        methodName: 'findUser',
        returnType: 'User',
        parameters: [{ name: 'id', type: 'Long' }],
        throwsList: [],
        visibility: 'PUBLIC',
        sourceCode: 'User findUser(Long id) { return null; }',
        lineStart: 10,
        lineEnd: 12,
        endpoints: [
          {
            id: 3,
            httpMethod: 'GET',
            path: '/users/{id}',
            consumes: null,
            produces: null,
            methodName: 'findUser',
          },
        ],
      },
    ],
  },
  {
    id: 4,
    packageName: 'com.example.golden',
    className: 'CreateUserRequest',
    qualifiedName: 'com.example.golden.CreateUserRequest',
    classType: 'RECORD',
    filePath: 'CreateUserRequest.java',
    sourceCode: 'public record CreateUserRequest(String name, UserStatus status) {\n}',
    methods: [],
  },
];

afterEach(cleanup);

describe('ClassTree', () => {
  it('expands class and method details', () => {
    render(<ClassTree classes={classes} />);

    expect(screen.queryByText('findUser')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('TreeViewExpandIconIcon'));
    const methodLabels = screen.getAllByText('findUser');
    fireEvent.click(methodLabels[methodLabels.length - 1]!);

    expect(screen.getByText(/\/users\/\{id\}/)).toBeInTheDocument();
    expect(screen.getAllByText(/User findUser/).length).toBeGreaterThan(0);
  });

  it('shows class source for DTOs without methods', () => {
    render(<ClassTree classes={classes} />);

    fireEvent.click(screen.getByText('CreateUserRequest'));

    expect(screen.getByText(/public record CreateUserRequest/)).toBeInTheDocument();
    expect(screen.getByText(/public record CreateUserRequest/).closest('pre'))
      .toHaveClass('max-h-[calc(100vh-220px)]');
  });
});
