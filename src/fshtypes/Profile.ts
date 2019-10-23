import { Rule } from './rules/Rule';

export class Profile {
  id: string;
  parent?: string;
  rules: Rule[];

  constructor(public name: string) {
    this.id = name; // init same as name
    this.rules = [];
  }
}