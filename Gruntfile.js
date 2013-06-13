module.exports = function(grunt) {

  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-contrib-concat");
  grunt.loadNpmTasks("grunt-contrib-less");
  
  var options = {
    watch: {
      css: {
        files: ["public/css/*.less"],
        tasks: ["less"],
        options: {
          nospawn: true
        }
      },
      js: {
        files: ["public/js/Main.js", "public/js/Controller.*.js", "public/js/Service.*.js"],
        tasks: ["concat"],
        options: {
          nospawn: true
        }
      }
    },
    less: {
      dev: {
        files: {
          "public/css/rss.css": "public/css/rss.less"
        }
      } 
    },
    concat: {
      dev: {
        src: [
          "public/js/angular.min.js",
          "public/js/Main.js",
          "public/js/Controller.*.js",
          "public/js/Service.*.js",
        ],
        dest: "public/js/weir.js"
      }
    }
  }
  
  grunt.initConfig(options);
  
  grunt.registerTask("build", "Create client-side files", ["concat", "less"]);
  
};
