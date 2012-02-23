require 'rubygems'
require 'fileutils'

SOURCES = %w(
  jquery.quinn.js
  plugins/balancer/jquery.quinn.balancer.js
)

# Helpers --------------------------------------------------------------------

# Minified a JavaScript file using the Closure compiler.
#
# orig_path - Path to the original, uncompressed file.
#
def minify(orig_path)
  min_path = orig_path.gsub(/\.js$/, '.min.js')
  min_path = "minified/#{min_path.split('/').last}"

  source   = File.read(orig_path)
  min      = Closure::Compiler.new.compress(source)

  File.open(min_path, 'w') { |f| f.puts min }
end

# Tasks ----------------------------------------------------------------------

desc 'Build the library and readme'
task :build => [:readme, :annotated, :minified] do
end

desc 'Build the minified version'
task :minified do
  require 'closure-compiler'

  SOURCES.each { |source| minify source }
end

desc 'Builds the annotated source code docs'
task :annotated do
  %x( bundle exec rocco #{ SOURCES.join(' ') } )

  SOURCES.each do |source|
    source = source.gsub(/\.js$/, '.html')
    FileUtils.mv(source, "docs/#{source}")
  end
end

desc 'Build the index.html readme'
task :readme do
  require 'kramdown'

  markdown = Kramdown::Document.new(File.read('README.md'))
  index    = File.read('index.html')

  index.gsub!(/^    <!-- begin README -->.*<!-- end README -->\n/m, <<-HTML)
    <!-- begin README -->

    #{markdown.to_html}
    <!-- end README -->
  HTML

  File.open('index.html', 'w') { |f| f.puts index }
end

desc 'Show the library filesize, including when Gzipped'
task :filesizes do
  require 'zlib'
  require 'stringio'

  development = File.size('jquery.quinn.js')
  minified    = File.size('jquery.quinn.min.js')

  output = StringIO.new
  output.set_encoding 'BINARY'

  gz = Zlib::GzipWriter.new(output)
  gz.write(File.read('jquery.quinn.min.js'))
  gz.close

  gzipped = output.string.bytesize

  puts <<-INFO

    Quinn library filesizes
    -----------------------

    Development:  #{(development.to_f / 1024).round(1)}kb
    Minified:     #{(minified.to_f / 1024).round(1)}kb
    Gzipped:      #{(gzipped.to_f / 1024).round(1)}kb

  INFO
end
