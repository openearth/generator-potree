'use strict';
var generators = require('yeoman-generator');
var yosay = require('yosay');
var chalk = require('chalk');
var wiredep = require('wiredep');
var mkdirp = require('mkdirp');
var _s = require('underscore.string');
var _ = require('lodash');

module.exports = generators.Base.extend({
  constructor: function () {
    var testLocal;

    generators.Base.apply(this, arguments);

    this.option('skip-welcome-message', {
      desc: 'Skips the welcome message',
      type: Boolean
    });

    this.option('skip-install-message', {
      desc: 'Skips the message after the installation of dependencies',
      type: Boolean
    });

    this.option('test-framework', {
      desc: 'Test framework to be invoked',
      type: String,
      defaults: 'mocha'
    });

    if (this.options['test-framework'] === 'mocha') {
      testLocal = require.resolve('generator-mocha/generators/app/index.js');
    } else if (this.options['test-framework'] === 'jasmine') {
      testLocal = require.resolve('generator-jasmine/generators/app/index.js');
    }

    this.composeWith(this.options['test-framework'] + ':app', {
      options: {
        'skip-install': this.options['skip-install']
      }
    }, {
      local: testLocal
    });
  },

  initializing: function () {
    this.pkg = require('../../package.json');
  },

  prompting: function () {
    var done = this.async();

    if (!this.options['skip-welcome-message']) {
      this.log(yosay("Hi. Let's create a pointcloud viewer."));
    }

    var prompts = [{
      type: 'checkbox',
      name: 'features',
      message: 'What more would you like?',
      choices: [{
        name: 'Sass',
        value: 'includeSass',
        checked: true
      }, {
        name: 'Bootstrap',
        value: 'includeBootstrap',
        checked: true
      }]
    },{
      type: 'input',
      name: 'pointcloud',
      message: 'where is our pointcloud (cloud.js file)',
      default: 'http://5.9.65.151/mschuetz/potree/resources/pointclouds/opentopography/CA13_1.4/cloud.js',
      store: true
    }];

    this.prompt(prompts, function (answers) {
      function hasFeature(feat) {
        return features && features.indexOf(feat) !== -1;
      }
      if (_.has(answers, 'features')) {
        var features = answers.features;


        // manually deal with the response, get back and store the results.
        // we change a bit this way of doing to automatically do this in the self.prompt() method.
        this.includeSass = hasFeature('includeSass');
        this.includeBootstrap = hasFeature('includeBootstrap');
      }
      if (_.has(answers, 'pointcloud')) {
        this.pointcloud = answers.pointcloud;
      }

      done();
    }.bind(this));

  },

  writing: {
    gulpfile: function () {
      this.fs.copyTpl(
        this.templatePath('gulpfile.babel.js'),
        this.destinationPath('gulpfile.babel.js'),
        {
          date: (new Date()).toISOString().split('T')[0],
          name: this.pkg.name,
          version: this.pkg.version,
          includeSass: this.includeSass,
          includeBootstrap: this.includeBootstrap,
          testFramework: this.options['test-framework']
        }
      );
    },

    packageJSON: function () {
      this.fs.copyTpl(
        this.templatePath('_package.json'),
        this.destinationPath('package.json'),
        {
          includeSass: this.includeSass
        }
      );
    },

    git: function () {
      this.fs.copy(
        this.templatePath('gitignore'),
        this.destinationPath('.gitignore'));

      this.fs.copy(
        this.templatePath('gitattributes'),
        this.destinationPath('.gitattributes'));
    },

    bower: function () {
      var bowerJson = {
        name: _s.slugify(this.appname),
        private: true,
        dependencies: {
          // threejs is a bit big, this is a minified version
          // version 0.73 moved ImageUtils generate something to Examples.
          'three.js': '<0.73.0',
          // these 2 don't have proper version numbers
          'stats.js': '*',
          'dat-gui': '*',
          jquery: '*',
          'jquery-ui': '*',
          d3: '>=3.5.10',
          proj4: '>=2.3.12',
          //  Tim from OpenLayers doesn't like bower packages (https://github.com/openlayers/ol3/issues/3119#issuecomment-156653092), so we'll use this one
          'ol3-bower': '*',
          // not on bower
          potree: 'https://github.com/potree/potree.git#develop',
          modernizr: '~2.8.1'
        }
      };

      if (this.includeBootstrap) {
        if (this.includeSass) {
          bowerJson.dependencies['bootstrap-sass'] = '~3.3.5';
          bowerJson.overrides = {
            'bootstrap-sass': {
              main: [
                'assets/stylesheets/_bootstrap.scss',
                'assets/fonts/bootstrap/*',
                'assets/javascripts/bootstrap.js'
              ]
            }
          };
        } else {
          bowerJson.dependencies.bootstrap = '~3.3.5';
          bowerJson.overrides = {
            bootstrap: {
              main: [
                'less/bootstrap.less',
                'dist/css/bootstrap.css',
                'dist/js/bootstrap.js',
                'dist/fonts/*'
              ]
            }
          };
        }
      }

      _.merge(bowerJson.overrides, {
        'dat-gui': {
          main: [
            'build/dat.gui.js'
          ]
        },
        'jquery-ui': {
          main: [
            'jquery-ui.js',
            'themes/smoothness/jquery-ui.min.css'
          ]
        },
        potree: {
          main: [
            'src/viewer/potree.css',
            'libs/other/BinaryHeap.js',
            'build/js/potree.js',
            // bit buggy here, some undeclared variables.
            // overwrite potree.js has an old version
            'src/viewer/viewer.js',
            'src/viewer/map.js',
            'src/viewer/profile.js',
            'src/viewer/ProgressBar.js',
            'src/PointCloudOctree.js',
            'src/PointCloudOctreeGeometry.js',
            'src/loader/POCLoader.js',
            'src/loader/BinaryLoader.js',
            'src/loader/LasLazLoader.js',
            'src/materials/PointCloudMaterial.js',
            'src/materials/EyeDomeLightingMaterial.js',
            'src/EarthControls.js',
            'src/OrbitControls.js',
            'src/FirstPersonControls.js',
            'src/GeoControls.js',
            'src/utils/ProfileTool.js',
            'src/utils/MeasuringTool.js',
            'src/utils/TransformationTool.js',
            'src/utils/VolumeTool.js',
            'src/utils.js',
            'src/LRU.js',
            'src/Annotation.js',
            'src/TextSprite.js',
            'src/Features.js',
            'src/extensions/PerspectiveCamera.js',
            'src/arena4d/PointCloudArena4D.js',
            'src/arena4d/PointCloudArena4DGeometry.js',
            'libs/plasio/js/laslaz.js',
            'libs/plasio/vendor/bluebird.js',
            'libs/tween/tween.min.js',
            'build/potree/laslaz.js',
            // linked in html files
            'src/viewer/profile.html'

          ]
        }
      });


      this.fs.writeJSON('bower.json', bowerJson);
      this.fs.copy(
        this.templatePath('bowerrc'),
        this.destinationPath('.bowerrc')
      );
    },

    editorConfig: function () {
      this.fs.copy(
        this.templatePath('editorconfig'),
        this.destinationPath('.editorconfig')
      );
    },

    h5bp: function () {
      this.fs.copy(
        this.templatePath('favicon.ico'),
        this.destinationPath('app/favicon.ico')
      );

      this.fs.copy(
        this.templatePath('apple-touch-icon.png'),
        this.destinationPath('app/apple-touch-icon.png')
      );

      this.fs.copy(
        this.templatePath('robots.txt'),
        this.destinationPath('app/robots.txt'));
    },

    styles: function () {
      var css = 'main';

      if (this.includeSass) {
        css += '.scss';
      } else {
        css += '.css';
      }

      this.fs.copyTpl(
        this.templatePath(css),
        this.destinationPath('app/styles/' + css),
        {
          includeBootstrap: this.includeBootstrap
        }
      );
    },

    scripts: function () {
      this.fs.copyTpl(
        this.templatePath('main.js'),
        this.destinationPath('app/scripts/main.js'),
        {
          pointcloud: this.pointcloud
        }
      );
    },

    html: function () {
      var bsPath;

      // path prefix for Bootstrap JS files
      if (this.includeBootstrap) {
        bsPath = '/bower_components/';

        if (this.includeSass) {
          bsPath += 'bootstrap-sass/assets/javascripts/bootstrap/';
        } else {
          bsPath += 'bootstrap/js/';
        }
      }

      this.fs.copyTpl(
        this.templatePath('index.html'),
        this.destinationPath('app/index.html'),
        {
          appname: this.appname,
          includeSass: this.includeSass,
          includeBootstrap: this.includeBootstrap,
          bsPath: bsPath,
          bsPlugins: [
            'affix',
            'alert',
            'dropdown',
            'tooltip',
            'modal',
            'transition',
            'button',
            'popover',
            'carousel',
            'scrollspy',
            'collapse',
            'tab'
          ]
        }
      );
    },
    water: function(){
      this.fs.copy(
        this.templatePath('watershader'),
        this.destinationPath('app/resources/watershader')
      );
    },
    misc: function () {
      mkdirp('app/images');
      mkdirp('app/fonts');
    }
  },

  install: function () {
    this.installDependencies({
      skipMessage: this.options['skip-install-message'],
      skipInstall: this.options['skip-install']
    });
  },

  end: function () {
    var bowerJson = this.fs.readJSON(this.destinationPath('bower.json'));
    var howToInstall =
          '\nAfter running ' +
          chalk.yellow.bold('npm install & bower install') +
          ', inject your' +
          '\nfront end dependencies by running ' +
          chalk.yellow.bold('gulp wiredep') +
          '.';

    if (this.options['skip-install']) {
      this.log(howToInstall);
      return;
    }

    // wire Bower packages to .html
    wiredep({
      bowerJson: bowerJson,
      directory: 'bower_components',
      exclude: ['bootstrap-sass', 'bootstrap.js'],
      ignorePath: /^(\.\.\/)*\.\./,
      src: 'app/index.html'
    });

    if (this.includeSass) {
      // wire Bower packages to .scss
      wiredep({
        bowerJson: bowerJson,
        directory: 'bower_components',
        ignorePath: /^(\.\.\/)+/,
        src: 'app/styles/*.scss'
      });
    }
  }
});
