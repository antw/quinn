require 'rubygems'

desc 'Build the library'
task :build => :readme do
  require 'closure-compiler'

  source  = File.read('jquery.quinn.js')
  min     = Closure::Compiler.new.compress(source)

  File.open('jquery.quinn.min.js', 'w') { |f| f.puts min }
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
