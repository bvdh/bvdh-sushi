import fs from 'fs-extra';
import path from 'path';
import temp from 'temp';
import { EOL } from 'os';
import { IGExporter } from '../../src/ig';
import { Package } from '../../src/export';
import { loggerSpy } from '../testhelpers/loggerSpy';
import { minimalConfig } from '../utils/minimalConfig';
import {
  simpleMenuXMLContent,
  subMenuXMLContent,
  subMenuWithWarningXMLContent
} from './fixtures/menuXMLContent';

describe('IGExporter', () => {
  // Track temp files/folders for cleanup
  temp.track();

  describe('#menu-xml', () => {
    let tempOut: string;

    beforeAll(() => {
      tempOut = temp.mkdirSync('sushi-test');
    });

    afterAll(() => {
      temp.cleanupSync();
    });

    beforeEach(() => {
      loggerSpy.reset();
    });

    it('should do nothing when config.menu is undefined and none provided', () => {
      const pkg = new Package(minimalConfig);
      const igDataPath = path.resolve(__dirname, 'fixtures', 'simple-ig', 'ig-data');
      const exporter = new IGExporter(pkg, null, igDataPath);
      exporter.addMenuXML(tempOut);
      const menuPath = path.join(tempOut, 'input', 'includes', 'menu.xml');
      expect(fs.existsSync(menuPath)).toBeFalsy();
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should use user-provided menu.xml when config.menu is not defined', () => {
      const pkg = new Package(minimalConfig);
      const igDataPath = path.resolve(__dirname, 'fixtures', 'customized-ig', 'ig-data');
      const exporter = new IGExporter(pkg, null, igDataPath);
      exporter.addMenuXML(tempOut);
      const menuPath = path.join(tempOut, 'input', 'includes', 'menu.xml');
      expect(fs.existsSync(menuPath)).toBeTruthy();
      const content = fs.readFileSync(menuPath, 'utf8');
      expect(content).toMatch(/^<!-- menu.xml {% comment %}$/m);
      expect(content).toMatch(/^\*\s+WARNING: DO NOT EDIT THIS FILE\s+\*$/m);
      expect(content).toMatch(
        /^\*\s+To change the contents of this file, edit the original source file at:\s+\*$/m
      );
      expect(content).toMatch(/^\*\s+ig-data[\/\\]input[\/\\]includes[\/\\]menu\.xml\s+\*$/m);
      expect(content).toMatch('<li><a href="index.html">My special menu</a></li>');
      expect(content).toMatch('<li><a href="toc.html">Customized Table of Contents</a></li>');
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should use config.menu when defined even with user-provided menu.xml present and log a warning', () => {
      const config = { ...minimalConfig };
      config.menu = [{ name: 'Animals', url: 'animals.html' }];
      const pkg = new Package(config);
      const igDataPath = path.resolve(__dirname, 'fixtures', 'customized-ig', 'ig-data');
      const exporter = new IGExporter(pkg, null, igDataPath);
      exporter.addMenuXML(tempOut);
      const menuPath = path.join(tempOut, 'input', 'includes', 'menu.xml');
      expect(fs.existsSync(menuPath)).toBeTruthy();
      const content = fs.readFileSync(menuPath, 'utf8');
      expect(content).toMatch(/^<!-- menu.xml {% comment %}$/m);
      expect(content).toMatch(/^\*\s+WARNING: DO NOT EDIT THIS FILE\s+\*$/m);
      expect(content).toMatch(
        /^\*\s+To change the contents of this file, edit the "menu" attribute in the tank config.yaml file\s+\*$/m
      );
      expect(content).toMatch(
        /^\*\s+or provide your own menu\.xml in the ig-data[\/\\]input[\/\\]includes folder\s+\*$/m
      );
      expect(content).toMatch('<a href="animals.html">Animals</a>');

      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage()).toMatch(
        /Found both a "menu" property in config.yaml and a menu.xml file.*File: .*menu.xml/s
      );
    });

    it('should build simple menu.xml when provided in config.menu', () => {
      const config = { ...minimalConfig };
      config.menu = [
        { name: 'Animals', url: 'animals.html' },
        { name: 'Plants', url: 'plants.html' },
        { name: 'Other' }
      ];
      const pkg = new Package(config);
      const exporter = new IGExporter(pkg, null, '');
      exporter.addMenuXML(tempOut);
      const menuPath = path.join(tempOut, 'input', 'includes', 'menu.xml');
      expect(fs.existsSync(menuPath)).toBeTruthy();
      const content = fs.readFileSync(menuPath, 'utf8');
      expect(content).toMatch(/^<!-- menu.xml {% comment %}$/m);
      expect(content).toMatch(/^\*\s+WARNING: DO NOT EDIT THIS FILE\s+\*$/m);
      expect(content).toMatch(
        /^\*\s+To change the contents of this file, edit the "menu" attribute in the tank config.yaml file\s+\*$/m
      );
      expect(content).toMatch(
        /^\*\s+or provide your own menu\.xml in the ig-data[\/\\]input[\/\\]includes folder\s+\*$/m
      );
      expect(content).toContain(simpleMenuXMLContent.replace(/\n/g, EOL));
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should build menu with a sub-menu when provided in config.menu', () => {
      const config = { ...minimalConfig };
      config.menu = [
        { name: 'Animals', url: 'animals.html' },
        {
          name: 'Plants',
          subMenu: [
            { name: 'Trees', url: 'plants.html#trees' },
            { name: 'Flowers', url: 'buds.html' }
          ]
        }
      ];
      const pkg = new Package(config);
      const exporter = new IGExporter(pkg, null, '');
      exporter.addMenuXML(tempOut);
      const menuPath = path.join(tempOut, 'input', 'includes', 'menu.xml');
      expect(fs.existsSync(menuPath)).toBeTruthy();
      const content = fs.readFileSync(menuPath, 'utf8');
      expect(content).toContain(subMenuXMLContent.replace(/\n/g, EOL));
      expect(loggerSpy.getAllMessages()).toHaveLength(0);
    });

    it('should build and log a warning when provided menu has sub-menus more than two deep', () => {
      const config = { ...minimalConfig };
      config.menu = [
        { name: 'Animals', url: 'animals.html' },
        {
          name: 'Plants',
          subMenu: [
            { name: 'Trees', url: 'plants.html#trees' },
            {
              name: 'Flowers',
              subMenu: [{ name: 'Roses', url: 'buds.html#roses' }, { name: 'Tulips' }]
            }
          ]
        }
      ];
      const pkg = new Package(config);
      const exporter = new IGExporter(pkg, null, '');
      exporter.addMenuXML(tempOut);
      const menuPath = path.join(tempOut, 'input', 'includes', 'menu.xml');
      expect(fs.existsSync(menuPath)).toBeTruthy();
      const content = fs.readFileSync(menuPath, 'utf8');
      expect(content).toContain(subMenuWithWarningXMLContent.replace(/\n/g, EOL));
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage()).toMatch(/The Flowers menu item specifies a sub-menu/s);
    });
  });
});
