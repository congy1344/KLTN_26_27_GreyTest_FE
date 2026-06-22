// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
];

describe('ClassTree', () => {
  it('expands class and method details', () => {
    render(<ClassTree classes={classes} />);

    fireEvent.click(screen.getByRole('button', { name: /UserController/ }));
    fireEvent.click(screen.getByRole('button', { name: /findUser/ }));

    expect(screen.getByText('/users/{id}')).toBeInTheDocument();
    expect(screen.getByText(/User findUser/)).toBeInTheDocument();
  });
});
