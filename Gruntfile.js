'use strict';

// # Globbing
// for performance reasons we're only matching one level down:
// 'test/spec/{,*/}*.js'
// use this if you want to recursively match all subfolders:
// 'test/spec/**/*.js'

module.exports = function (grunt) {

  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  // Time how long tasks take. Can help when optimizing build times
  require('time-grunt')(grunt);

  // Configurable paths
  var config = {
    app: 'app.safariextension',
    dist: 'dist.safariextension'
  };

  grunt.initConfig({

    // Project settings
    config: config,

    // Watches files for changes and runs tasks based on the changed files
    watch: {
      bower: {
        files: ['bower.json'],
        tasks: ['bower:install']
      },
      js: {
        files: [
          '<%= config.app %>/scripts/{,*/}*.js',
          '<%= config.app %>/scripts/{,*/}*.jsx'
        ],
        tasks: ['react', 'jshint']
      },
      gruntfile: {
        files: ['Gruntfile.js']
      },
      styles: {
        files: ['<%= config.app %>/styles/{,*/}*.css'],
        tasks: [],
        options: {
        }
      }
    },

    // Install Bower packages
    bower: {
      install: {
      }
    },

    react: {
      files: {
        expand: true,
        cwd: '<%= config.app %>',
        src: ['**/*.jsx'],
        dest: '<%= config.dist %>',
        ext: '.js'
      }
    },

    // Reads HTML for usemin blocks to enable smart builds that automatically
    // concat, minify and revision files. Creates configurations in memory so
    // additional tasks can operate on them
    useminPrepare: {
      options: {
        dest: '<%= config.dist %>'
      },
      html: [
        '<%= config.app %>/global.html',
        '<%= config.app %>/bar.html'
      ]
    },

    // Performs rewrites based on rev and the useminPrepare configuration
    usemin: {
      options: {
        assetsDirs: ['<%= config.dist %>', '<%= config.dist %>/images']
      },
      html: ['<%= config.dist %>/{,*/}*.html'],
      css: ['<%= config.dist %>/styles/{,*/}*.css']
    },

    // The following *-min tasks produce minifies files in the dist folder
    imagemin: {
      icon: {
        files: {
          '<%= config.dist %>/icon.png': '<%= config.app %>/icon.png'
        }
      },
      dist: {
        files: [{
          expand: true,
          cwd: '<%= config.app %>/images',
          src: '{,*/}*.{gif,jpeg,jpg,png}',
          dest: '<%= config.dist %>/images'
        }]
      }
    },

    // Empties folders to start fresh
    clean: {
      app: {
      },
      dist: {
        files: [{
          dot: true,
          src: [
            '<%= config.dist %>/*',
            '!<%= config.dist %>/.git*'
          ]
        }]
      }
    },

    // Make sure code styles are up to par and there are no obvious mistakes
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      all: [
        'Gruntfile.js',
        '<%= config.app %>/scripts/{,*/}*.js',
        '!<%= config.app %>/scripts/vendor/*',
        'test/spec/{,*/}*.js'
      ]
    },

    // Copies remaining files to places other tasks can use
    copy: {
      dist: {
        files: [{
          expand: true,
          dot: true,
          cwd: '<%= config.app %>',
          dest: '<%= config.dist %>',
          src: [
            '*.{ico,txt}',
            'images/{,*/}*.{webp,gif}',
            '{,*/}*.html',
            'styles/fonts/{,*/}*.*',
            '{,*/}*.plist',
            '{,*/}*.js',
            '**/*.map',

            'bower_components/underscore/underscore-min.js',
            'bower_components/reflux/dist/reflux.min.js',
            'bower_components/react/react.min.js',
          ]
        }]
      }
    },

    // Run some tasks in parallel to speed up build process
    concurrent: {
      app: [
      ],
      dist: [
        'imagemin',
      ],
      test: [
      ]
    },
  });

  grunt.registerTask('debug', function () {
    grunt.task.run([
      'jshint',
      'concurrent:app',
      'watch'
    ]);
  });

  grunt.registerTask('build', [
    'clean:dist',
    'concurrent:dist',
    'react',
    'useminPrepare',
    'concat',
    'cssmin',
    'copy',
    'usemin'
  ]);

  grunt.registerTask('default', [
    'jshint',
    'build'
  ]);

};
