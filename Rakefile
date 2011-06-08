require 'rubygems'

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
