module.exports = function(grunt) {

  grunt.initConfig({
    jshint: {
      files: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
      options: {
        globals: {
          jQuery: true
        }
      }
    },
    wiredep: {
      task: {
        src: ['index.html']
      },
      options: {}
    },
    sass: {
      dist: {
        files: [{
          expand: true,
          cwd: 'src/style',
          dest: 'dist/style',
          src: ['*.scss'],
          ext: '.css'
        }]
      }
    },
    watch: {
      files: ['<%= jshint.files %>', 'index.html', 'src/style/**/*.scss'],
      tasks: ['jshint', 'wiredep', 'sass']
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-wiredep');
  grunt.loadNpmTasks('grunt-contrib-sass');

  grunt.registerTask('default', ['jshint', 'wiredep', 'sass']);

};
